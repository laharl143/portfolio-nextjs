import "server-only";
import { timingSafeEqual } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb, rows, validateWorkspace } from "./db";
import { IntakeError, UUID } from "./rules";

export function authorizeCleanup(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const value = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (
    process.env.VERCEL_ENV !== "production" ||
    Buffer.byteLength(secret) < 32 ||
    Buffer.byteLength(value) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(value), Buffer.from(expected))
  )
    throw new IntakeError("UNAUTHORIZED", 401);
  const workspace = process.env.LEAD_INTAKE_WORKSPACE_ID ?? "";
  if (!UUID.test(workspace)) throw new IntakeError("UNAVAILABLE", 503);
  return workspace;
}
export async function cleanupInquiries(workspace: string) {
  await validateWorkspace(workspace, true);
  let deleted = 0,
    windows = 0,
    complete = false;
  try {
    for (let batch = 0; batch < 10; batch++) {
      const result = await getDb().transaction(async (tx) => {
        const [lock] = await rows<{ locked: boolean }>(
          tx,
          sql`select pg_try_advisory_xact_lock(hashtextextended(${`inquiry:${workspace}`},0)) as locked`,
        );
        if (!lock.locked) return null;
        const removed = await rows(
          tx,
          sql`delete from studio.inquiries where workspace_id=${workspace}::uuid and id in(select i.id from studio.inquiries i where i.workspace_id=${workspace}::uuid and (case when status='converted' then converted_at else last_activity_at end)<=now()-interval '12 months' and not exists(select 1 from studio.inquiry_alerts a where a.inquiry_id=i.id and a.state='sending' and a.lease_expires_at>now()) order by coalesce(converted_at,last_activity_at),id limit 1000 for update) returning id`,
        );
        const old = await rows(
          tx,
          sql`delete from studio.inquiry_rate_windows where workspace_id=${workspace}::uuid and window_start<now()-interval '48 hours' returning key_hash`,
        );
        const backlog = await rows(
          tx,
          sql`select 1 from studio.inquiries where workspace_id=${workspace}::uuid and (case when status='converted' then converted_at else last_activity_at end)<=now()-interval '12 months' limit 1`,
        );
        return {
          deleted: removed.length,
          windows: old.length,
          complete: backlog.length === 0,
        };
      });
      if (!result) {
        if (deleted === 0 && windows === 0)
          return { deleted, windows, outcome: "overlap" };
        complete = false;
        break;
      }
      deleted += result.deleted;
      windows += result.windows;
      complete = result.complete;
      if (complete || result.deleted === 0) break;
    }
    await getDb().execute(
      sql`update studio.inquiry_maintenance set deleted_inquiries=${deleted},deleted_rate_windows=${windows},outcome=${complete ? "complete" : "incomplete"},error_code=null,last_success_at=case when ${complete} then now() else last_success_at end where workspace_id=${workspace}::uuid`,
    );
    return { deleted, windows, outcome: complete ? "complete" : "incomplete" };
  } catch (error) {
    await getDb()
      .execute(
        sql`update studio.inquiry_maintenance set deleted_inquiries=${deleted},deleted_rate_windows=${windows},outcome='failed',error_code='CLEANUP_FAILED' where workspace_id=${workspace}::uuid`,
      )
      .catch(() => {});
    throw error;
  }
}
