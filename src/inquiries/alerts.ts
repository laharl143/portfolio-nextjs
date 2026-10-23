import "server-only";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { SITE_URL } from "@/lib/site";
import { getDb, rows, workspaceLock } from "./db";
import { getAlertConfig, type AlertConfig } from "./config";
import { IntakeError } from "./rules";
import { createAlertBody, readAlertBody } from "./alert-email";

type Attempt = {
  id: string;
  state: string;
  generation: number;
  updated_at: string;
  lease_id: string | null;
  live: boolean;
  cooldown: boolean;
  outside_window: boolean;
  first_attempted_at: string | null;
  sender: string | null;
  recipient: string | null;
  subject: string | null;
  body: string | null;
  provider_key: string | null;
};
export type Retry = {
  version: string;
  generation: number;
  confirmDuplicate: boolean;
  actor: string;
};
export async function sendAlertPayload(
  payload: {
    sender: string;
    recipient: string;
    subject: string;
    body: string;
    provider_key: string;
  },
  key: string,
  fetcher: typeof fetch = fetch,
): Promise<{
  state: "accepted" | "failed" | "unknown";
  messageId?: string;
  code?: string;
}> {
  try {
    const response = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": payload.provider_key,
      },
      body: JSON.stringify({
        from: payload.sender,
        to: [payload.recipient],
        subject: payload.subject,
        ...readAlertBody(payload.body),
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok)
      return {
        state: response.status >= 500 ? "unknown" : "failed",
        code:
          response.status >= 500 ? "PROVIDER_UNCERTAIN" : "PROVIDER_REJECTED",
      };
    const data = await response.json();
    return typeof data.id === "string"
      ? { state: "accepted", messageId: data.id }
      : { state: "unknown", code: "INVALID_PROVIDER_RESULT" };
  } catch {
    return { state: "unknown", code: "PROVIDER_UNCERTAIN" };
  }
}
export async function attemptAlert(
  id: string,
  workspace: string,
  config: AlertConfig = getAlertConfig(),
  retry?: Retry,
  fetcher: typeof fetch = fetch,
) {
  const lease = randomUUID();
  const attempt = await getDb().transaction(async (tx) => {
    await workspaceLock(tx, workspace);
    const found = await rows(
      tx,
      sql`select id from studio.inquiries where id=${id}::uuid and workspace_id=${workspace}::uuid for update`,
    );
    if (!found.length) throw new IntakeError("NOT_FOUND", 404);
    const [a] = await rows<Attempt>(
      tx,
      sql`select a.*,a.updated_at::text as updated_at,(a.state='sending' and a.lease_expires_at>now()) as live,(a.last_attempted_at>now()-interval '1 minute') as cooldown,(a.first_attempted_at<now()-interval '23 hours') as outside_window from studio.inquiry_alerts a where inquiry_id=${id}::uuid for update`,
    );
    if (!a) throw new IntakeError("NOT_FOUND", 404);
    if (!retry && a.state !== "pending") return null;
    if (a.state === "accepted") throw new IntakeError("ALREADY_ACCEPTED", 409);
    if (a.live) throw new IntakeError("SENDING", 409);
    if (retry) {
      if (a.updated_at !== retry.version || a.generation !== retry.generation)
        throw new IntakeError("STALE_RECORD", 409);
      if (a.cooldown) throw new IntakeError("RETRY_COOLDOWN", 429);
      if (
        a.outside_window &&
        ["unknown", "sending"].includes(a.state) &&
        !retry.confirmDuplicate
      )
        throw new IntakeError("CONFIRM_DUPLICATE_RISK", 409);
    }
    const fresh = !a.first_attempted_at || a.outside_window;
    const generation = a.generation + (a.first_attempted_at && fresh ? 1 : 0);
    const payload = fresh
      ? {
          sender: config.sender,
          recipient: config.recipient,
          subject: "New portfolio inquiry",
          body: createAlertBody(`${SITE_URL}/studio/inquiries/${id}`),
          provider_key: `lead-inquiry/${a.id}/${generation}`,
        }
      : {
          sender: a.sender!,
          recipient: a.recipient!,
          subject: a.subject!,
          body: a.body!,
          provider_key: a.provider_key!,
        };
    await tx.execute(
      sql`update studio.inquiry_alerts set state='sending',generation=${generation},attempt_count=attempt_count+1,lease_id=${lease}::uuid,lease_expires_at=now()+interval '30 seconds',updated_at=clock_timestamp(),last_attempted_at=now(),first_attempted_at=case when ${fresh} then now() else first_attempted_at end,sender=${payload.sender},recipient=${payload.recipient},subject=${payload.subject},body=${payload.body},provider_key=${payload.provider_key},error_code=null where id=${a.id}::uuid`,
    );
    if (retry)
      await tx.execute(
        sql`insert into studio.inquiry_events(workspace_id,inquiry_id,kind,actor_user_id) values(${workspace}::uuid,${id}::uuid,'alert_retry',${retry.actor}::uuid)`,
      );
    return { alertId: a.id, payload };
  });
  if (!attempt) return;
  const result = await sendAlertPayload(
    attempt.payload,
    config.resendKey,
    fetcher,
  );
  // Lease ownership prevents late attempts from overwriting a newer result; deletion stays deletion.
  await getDb().execute(
    sql`update studio.inquiry_alerts set state=${result.state},provider_message_id=${result.messageId ?? null},error_code=${result.code ?? null},accepted_at=case when ${result.state}='accepted' then now() else null end,lease_id=null,lease_expires_at=null,updated_at=clock_timestamp() where id=${attempt.alertId}::uuid and lease_id=${lease}::uuid and state='sending' and exists(select 1 from studio.inquiries where id=inquiry_id and workspace_id=${workspace}::uuid)`,
  );
}
