import "server-only";
import { createHmac } from "node:crypto";
import { sql } from "drizzle-orm";
import type { Tx } from "@/studio/db/client";
import { getIntakeConfig, trustedAddress, type IntakeConfig } from "./config";
import { getDb, rows, validateWorkspace } from "./db";
import { IntakeError, parseSubmission, payloadHash } from "./rules";

const TEST_SECRET = "1x0000000000000000000000000000000AA";
export const LIMITS = { bytes: 65536, address: 10, email: 3 } as const;
export async function readBody(request: Request): Promise<unknown> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  )
    throw new IntakeError("JSON_REQUIRED", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new IntakeError("INVALID_INPUT");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > LIMITS.bytes) {
        await reader.cancel();
        throw new IntakeError("BODY_TOO_LARGE", 413);
      }
      chunks.push(part.value);
    }
    try {
      return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new IntakeError("INVALID_INPUT");
    }
  } finally {
    reader.releaseLock();
  }
}
async function quota(
  tx: Pick<Tx, "execute">,
  config: IntakeConfig,
  prefix: "ip" | "email",
  value: string,
) {
  const key = createHmac("sha256", config.rateSecret)
    .update(`${prefix}:${value}`)
    .digest("hex");
  const window =
    prefix === "ip"
      ? sql`to_timestamp(floor(extract(epoch from now())/600)*600)`
      : sql`date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'`;
  const limit = prefix === "ip" ? LIMITS.address : LIMITS.email;
  const result = await rows(
    tx,
    sql`insert into studio.inquiry_rate_windows(workspace_id,key_hash,window_start,count) values(${config.workspaceId}::uuid,${key},${window},1) on conflict(workspace_id,key_hash,window_start) do update set count=studio.inquiry_rate_windows.count+1 where studio.inquiry_rate_windows.count<${limit} returning count`,
  );
  if (!result.length) throw new IntakeError("RATE_LIMIT", 429);
}
export async function verifyChallenge(
  token: string,
  config: IntakeConfig,
  fetcher: typeof fetch = fetch,
) {
  try {
    const response = await fetcher(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: new URLSearchParams({
          secret: config.turnstileSecret,
          response: token,
        }),
        signal: AbortSignal.timeout(5000),
      },
    );
    const body = await response.json();
    const testing = body?.metadata?.result_with_testing_key === true;
    // Cloudflare's test secret replies with no action and hostname example.com,
    // so outside production a testing reply with success is enough (spec 0010).
    if (
      !config.production &&
      testing &&
      response.ok &&
      body.success === true &&
      config.turnstileSecret === TEST_SECRET
    )
      return;
    if (
      !response.ok ||
      body.success !== true ||
      (config.production && testing) ||
      body.action !== "lead_intake" ||
      body.hostname !== new URL(config.origin).hostname
    )
      throw new Error("rejected");
  } catch {
    throw new IntakeError("CHALLENGE_FAILED", 403);
  }
}
async function replay(
  config: IntakeConfig,
  key: string,
  hash: string,
): Promise<boolean> {
  const [found] = await rows<{ payload_hash: string }>(
    getDb(),
    sql`select payload_hash from studio.inquiries where workspace_id=${config.workspaceId}::uuid and submission_key=${key}::uuid`,
  );
  if (!found) return false;
  if (found.payload_hash !== hash) throw new IntakeError("KEY_CONFLICT", 409);
  return true;
}
export async function ingest(
  request: Request,
  options?: { config: IntakeConfig; address: string; fetcher?: typeof fetch },
): Promise<{ id: string | null; config: IntakeConfig }> {
  const config = options?.config ?? getIntakeConfig();
  if (request.headers.get("origin") !== config.origin)
    throw new IntakeError("INVALID_ORIGIN", 403);
  const body = await readBody(request);
  const address = options?.address ?? trustedAddress(request.headers);
  await validateWorkspace(config.workspaceId, config.production);
  await quota(getDb(), config, "ip", address);
  const input = parseSubmission(body);
  const hash = payloadHash(input);
  if (await replay(config, input.submissionKey, hash))
    return { id: null, config };
  await verifyChallenge(input.challengeToken, config, options?.fetcher);
  try {
    const id = await getDb().transaction(async (tx) => {
      await quota(tx, config, "email", input.email);
      const [saved] = await rows<{ id: string }>(
        tx,
        sql`insert into studio.inquiries(workspace_id,submission_key,payload_hash,name,email,description,company,budget,privacy_notice_version) values(${config.workspaceId}::uuid,${input.submissionKey}::uuid,${hash},${input.name},${input.email},${input.description},${input.company},${input.budget},${input.noticeVersion}) returning id`,
      );
      await tx.execute(
        sql`insert into studio.inquiry_events(workspace_id,inquiry_id,kind) values(${config.workspaceId}::uuid,${saved.id}::uuid,'submitted')`,
      );
      await tx.execute(
        sql`insert into studio.inquiry_alerts(inquiry_id) values(${saved.id}::uuid)`,
      );
      return saved.id;
    });
    return { id, config };
  } catch (error) {
    // Resolve only a committed matching key, including a concurrent unique conflict.
    if (await replay(config, input.submissionKey, hash))
      return { id: null, config };
    throw error;
  }
}
