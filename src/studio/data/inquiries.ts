import "server-only";
import "@/studio/marker";
import { sql } from "drizzle-orm";
import { getWorkspaceId } from "./workspace";
import { getDb, rows, workspaceLock } from "@/inquiries/db";
import {
  conversionHash,
  email,
  IntakeError,
  text,
  transitionAllowed,
  UUID,
} from "@/inquiries/rules";
import { formatDateTime } from "@/studio/format";

export type Inquiry = {
  id: string;
  name: string;
  email: string;
  description: string;
  company: string | null;
  budget: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
  converted_at: string | null;
  conversion_key: string | null;
  conversion_hash: string | null;
  converted_client_id: string | null;
  converted_contact_id: string | null;
  converted_note_id: string | null;
};
export type Alert = {
  id: string;
  state: string;
  generation: number;
  attempt_count: number;
  updated_at: string;
  lease_expires_at: string | null;
  first_attempted_at: string | null;
  last_attempted_at: string | null;
  provider_message_id: string | null;
  error_code: string | null;
  expired: boolean;
  outside_window: boolean;
};
const inquiryColumns = sql`i.*, i.created_at::text as created_at, i.updated_at::text as updated_at, i.last_activity_at::text as last_activity_at, i.converted_at::text as converted_at`;
export function validId(id: string) {
  if (!UUID.test(id)) throw new IntakeError("NOT_FOUND", 404);
}
export function validVersion(version: string) {
  if (version.length > 100 || !Number.isFinite(Date.parse(version)))
    throw new IntakeError("STALE_RECORD", 409);
}
export async function getInquiry(id: string) {
  validId(id);
  const workspace = await getWorkspaceId();
  const [inquiry] = await rows<Inquiry>(
    getDb(),
    sql`select ${inquiryColumns} from studio.inquiries i where i.id=${id}::uuid and i.workspace_id=${workspace}::uuid`,
  );
  if (!inquiry) throw new IntakeError("NOT_FOUND", 404);
  const [alerts, events] = await Promise.all([
    rows<Alert>(
      getDb(),
      sql`select a.id,a.state,a.generation,a.attempt_count,a.updated_at::text,a.lease_expires_at::text,a.first_attempted_at::text,a.last_attempted_at::text,a.provider_message_id,a.error_code,(a.state='sending' and a.lease_expires_at<=now()) as expired,(a.first_attempted_at<now()-interval '23 hours') as outside_window from studio.inquiry_alerts a join studio.inquiries i on i.id=a.inquiry_id where i.workspace_id=${workspace}::uuid and i.id=${id}::uuid`,
    ),
    rows<{ kind: string; created_at: string }>(
      getDb(),
      sql`select kind,created_at::text from studio.inquiry_events where workspace_id=${workspace}::uuid and inquiry_id=${id}::uuid order by created_at,id`,
    ),
  ]);
  return { inquiry, alert: alerts[0], events };
}
export async function listInquiries(params: {
  q?: string;
  status?: string;
  alert?: string;
  page?: string;
}) {
  const workspace = await getWorkspaceId();
  const q = (params.q ?? "").trim().slice(0, 100);
  const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const status = ["new", "reviewing", "converted", "closed"].includes(
    params.status ?? "",
  )
    ? params.status!
    : "";
  const alert = ["attention", "accepted"].includes(params.alert ?? "")
    ? params.alert!
    : "";
  const page = /^\d+$/.test(params.page ?? "")
    ? Math.max(1, Math.min(Number(params.page), 1000000))
    : 1;
  const where = sql`i.workspace_id=${workspace}::uuid and (${q}='' or i.name ilike ${pattern} or i.email ilike ${pattern} or i.company ilike ${pattern}) and (${status}='' or i.status=${status}) and (${alert}='' or (${alert}='accepted' and a.state='accepted') or (${alert}='attention' and (a.state in ('pending','failed','unknown') or (a.state='sending' and a.lease_expires_at<=now()))))`;
  const [items, count, health] = await Promise.all([
    rows<Inquiry & { alert_state: string }>(
      getDb(),
      sql`select ${inquiryColumns},case when a.state='sending' and a.lease_expires_at<=now() then 'unknown' else a.state end as alert_state from studio.inquiries i left join studio.inquiry_alerts a on a.inquiry_id=i.id where ${where} order by i.created_at desc,i.id desc limit 50 offset ${(page - 1) * 50}`,
    ),
    rows<{ total: number }>(
      getDb(),
      sql`select count(*)::int as total from studio.inquiries i left join studio.inquiry_alerts a on a.inquiry_id=i.id where ${where}`,
    ),
    rows<{ outcome: string; overdue: boolean }>(
      getDb(),
      sql`select outcome,coalesce(last_success_at,created_at)<now()-interval '48 hours' as overdue from studio.inquiry_maintenance where workspace_id=${workspace}::uuid`,
    ),
  ]);
  return {
    items,
    total: count[0].total,
    page,
    q,
    status,
    alert,
    health: health[0],
  };
}
export async function changeInquiryStatus(
  id: string,
  version: string,
  target: string,
  actor: string,
) {
  validId(id);
  validVersion(version);
  const workspace = await getWorkspaceId();
  await getDb().transaction(async (tx) => {
    await workspaceLock(tx, workspace);
    const [i] = await rows<Inquiry>(
      tx,
      sql`select ${inquiryColumns} from studio.inquiries i where id=${id}::uuid and workspace_id=${workspace}::uuid for update`,
    );
    if (!i) throw new IntakeError("NOT_FOUND", 404);
    if (i.updated_at !== version) throw new IntakeError("STALE_RECORD", 409);
    if (i.status === target) return;
    if (target === "converted" || !transitionAllowed(i.status, target))
      throw new IntakeError("INVALID_TRANSITION", 409);
    await tx.execute(
      sql`update studio.inquiries set status=${target},updated_at=clock_timestamp(),last_activity_at=clock_timestamp() where id=${id}::uuid and workspace_id=${workspace}::uuid`,
    );
    await tx.execute(
      sql`insert into studio.inquiry_events(workspace_id,inquiry_id,kind,actor_user_id) values(${workspace}::uuid,${id}::uuid,${i.status === "closed" ? "reopened" : target},${actor}::uuid)`,
    );
  });
}
export async function conversionClients(q: string, page = 1) {
  const workspace = await getWorkspaceId();
  const pattern = `%${q
    .trim()
    .slice(0, 100)
    .replace(/[\\%_]/g, "\\$&")}%`;
  return rows<{ id: string; name: string }>(
    getDb(),
    sql`select id,name from studio.clients where workspace_id=${workspace}::uuid and archived_at is null and name ilike ${pattern} order by name,id limit 51 offset ${(Math.max(1, Math.min(page, 1000000)) - 1) * 50}`,
  );
}
export type ConversionInput = {
  id: string;
  version: string;
  conversionKey: string;
  mode: string;
  clientId: string;
  clientName: string;
  contactName: string;
  contactEmail: string;
};
export async function conversionContacts(clientIds: string[]) {
  if (!clientIds.length) return [];
  const workspace = await getWorkspaceId();
  return rows<{
    id: string;
    client_id: string;
    full_name: string;
    email: string;
  }>(
    getDb(),
    sql`select id,client_id,full_name,email from studio.contacts where workspace_id=${workspace}::uuid and client_id in (${sql.join(
      clientIds.map((id) => sql`${id}::uuid`),
      sql`,`,
    )}) and archived_at is null and email is not null`,
  );
}
export async function convertInquiry(
  input: ConversionInput,
  actor: string,
): Promise<string> {
  validId(input.id);
  validId(input.conversionKey);
  const workspace = await getWorkspaceId();
  const name = text(input.contactName, "contactName", 200, 1);
  const address = email(input.contactEmail);
  if (!["new", "existing"].includes(input.mode))
    throw new IntakeError("INVALID_INPUT");
  const target =
    input.mode === "new"
      ? text(input.clientName, "clientName", 200, 1)
      : input.clientId;
  if (input.mode === "existing") validId(target);
  const hash = conversionHash(input.mode, target, name, address);
  return getDb().transaction(async (tx) => {
    await workspaceLock(tx, workspace);
    const [pre] = await rows<Inquiry>(
      tx,
      sql`select ${inquiryColumns} from studio.inquiries i where i.id=${input.id}::uuid and i.workspace_id=${workspace}::uuid`,
    );
    if (!pre) throw new IntakeError("NOT_FOUND", 404);
    if (pre.status === "converted") {
      if (
        pre.conversion_key === input.conversionKey &&
        pre.conversion_hash === hash
      )
        return pre.converted_client_id!;
      throw new IntakeError("ALREADY_CONVERTED", 409);
    }
    let clientId = target;
    if (input.mode === "existing") {
      const [client] = await rows<{ id: string; archived_at: string | null }>(
        tx,
        sql`select id,archived_at from studio.clients where id=${clientId}::uuid and workspace_id=${workspace}::uuid for update`,
      );
      if (!client) throw new IntakeError("NOT_FOUND", 404);
      if (client.archived_at) throw new IntakeError("CLIENT_ARCHIVED", 409);
    }
    const [i] = await rows<Inquiry>(
      tx,
      sql`select ${inquiryColumns} from studio.inquiries i where i.id=${input.id}::uuid and i.workspace_id=${workspace}::uuid for update`,
    );
    validVersion(input.version);
    if (i.updated_at !== input.version)
      throw new IntakeError("STALE_RECORD", 409);
    if (!transitionAllowed(i.status, "converted"))
      throw new IntakeError("INVALID_TRANSITION", 409);
    if (input.mode === "new") {
      const inserted = await rows<{ id: string }>(
        tx,
        sql`insert into studio.clients(workspace_id,name,status) values(${workspace}::uuid,${target},'lead') on conflict do nothing returning id`,
      );
      if (!inserted.length) throw new IntakeError("DUPLICATE_CLIENT_NAME", 409);
      clientId = inserted[0].id;
    }
    let [contact] = await rows<{ id: string }>(
      tx,
      sql`select id from studio.contacts where workspace_id=${workspace}::uuid and client_id=${clientId}::uuid and archived_at is null and lower(email)=${address}`,
    );
    if (!contact) {
      [contact] = await rows<{ id: string }>(
        tx,
        sql`insert into studio.contacts(workspace_id,client_id,full_name,email,preferred_channel,is_primary) values(${workspace}::uuid,${clientId}::uuid,${name},${address},'email',not exists(select 1 from studio.contacts where workspace_id=${workspace}::uuid and client_id=${clientId}::uuid and is_primary and archived_at is null)) returning id`,
      );
    }
    const body = `Portfolio inquiry received ${formatDateTime(new Date(i.created_at))}\n\n${i.description}${i.budget ? `\n\nBudget: ${i.budget}` : ""}`;
    const [note] = await rows<{ id: string }>(
      tx,
      sql`insert into studio.notes(workspace_id,client_id,body) values(${workspace}::uuid,${clientId}::uuid,${body}) returning id`,
    );
    await tx.execute(
      sql`update studio.inquiries set status='converted',conversion_key=${input.conversionKey}::uuid,conversion_hash=${hash},converted_at=clock_timestamp(),converted_client_id=${clientId}::uuid,converted_contact_id=${contact.id}::uuid,converted_note_id=${note.id}::uuid,updated_at=clock_timestamp(),last_activity_at=clock_timestamp() where id=${input.id}::uuid and workspace_id=${workspace}::uuid`,
    );
    await tx.execute(
      sql`insert into studio.inquiry_events(workspace_id,inquiry_id,kind,actor_user_id) values(${workspace}::uuid,${input.id}::uuid,'converted',${actor}::uuid)`,
    );
    return clientId;
  });
}
