import "server-only";
import "@/studio/marker";
import { sql } from "drizzle-orm";
import { getDb, rows } from "@/inquiries/db";
import {
  CLIENT_STATUSES,
  CONTRACT_STATUSES,
  PROJECT_STATUSES,
  type ClientStatus,
  type ContractStatus,
  type ProjectStatus,
} from "@/studio/db/constants";
import { productLinks, products } from "@/studio/systems/bundled";
import { diffPublic } from "@/studio/systems/drift";
import { getPublicProjection } from "@/studio/systems/projection";
import { getWorkspaceId } from "./workspace";

// Reads for the studio home dashboard (spec 0012, Value sourcing). Every read is scoped to the session
// workspace and throws on a query error; the page contains each failure to its own section.

const ATTENTION_ROWS = 3;

export type InquirySignal = {
  open: number;
  alertProblems: number;
  rows: { id: string; name: string; company: string | null; createdAt: string; alertProblem: boolean }[];
};

// The inbox mapping (listInquiries): an alert stuck in `sending` past its lease counts as `unknown`.
const alertProblem = sql`(a.state in ('failed','unknown') or (a.state='sending' and a.lease_expires_at<=now()))`;

export async function getInquirySignal(): Promise<InquirySignal> {
  const workspace = await getWorkspaceId();
  const [counts, items] = await Promise.all([
    rows<{ open: number; alert_problems: number }>(
      getDb(),
      sql`select count(*) filter (where i.status in ('new','reviewing'))::int as open,count(*) filter (where ${alertProblem})::int as alert_problems from studio.inquiries i left join studio.inquiry_alerts a on a.inquiry_id=i.id where i.workspace_id=${workspace}::uuid`,
    ),
    rows<{ id: string; name: string; company: string | null; created_at: string; alert_problem: boolean }>(
      getDb(),
      sql`select i.id,i.name,i.company,i.created_at::text as created_at,coalesce(${alertProblem},false) as alert_problem from studio.inquiries i left join studio.inquiry_alerts a on a.inquiry_id=i.id where i.workspace_id=${workspace}::uuid and i.status in ('new','reviewing') order by i.created_at asc,i.id asc limit ${ATTENTION_ROWS}`,
    ),
  ]);
  return {
    open: counts[0]?.open ?? 0,
    alertProblems: counts[0]?.alert_problems ?? 0,
    rows: items.map((row) => ({
      id: row.id,
      name: row.name,
      company: row.company,
      createdAt: row.created_at,
      alertProblem: row.alert_problem,
    })),
  };
}

export type ContractSignal = {
  sent: number;
  draft: number;
  rows: { id: string; title: string; clientName: string; status: "sent" | "draft"; changedAt: string }[];
};

// Sent first, then drafts, each oldest first by the latest status event (spec 0012, AC-4).
export async function getContractSignal(): Promise<ContractSignal> {
  const workspace = await getWorkspaceId();
  const [counts, items] = await Promise.all([
    rows<{ sent: number; draft: number }>(
      getDb(),
      sql`select count(*) filter (where status='sent')::int as sent,count(*) filter (where status='draft')::int as draft from studio.contracts where workspace_id=${workspace}::uuid and archived_at is null`,
    ),
    rows<{ id: string; title: string; client_name: string; status: "sent" | "draft"; changed_at: string }>(
      getDb(),
      sql`select id,title,client_name,status,changed_at::text as changed_at from (select c.id,c.title,cl.name as client_name,c.status,coalesce((select max(e.changed_at) from studio.contract_status_events e where e.workspace_id=${workspace}::uuid and e.contract_id=c.id),c.created_at) as changed_at from studio.contracts c join studio.clients cl on cl.id=c.client_id and cl.workspace_id=${workspace}::uuid where c.workspace_id=${workspace}::uuid and c.archived_at is null and c.status in ('sent','draft')) waiting order by (status='sent') desc,changed_at asc,id asc limit ${ATTENTION_ROWS}`,
    ),
  ]);
  return {
    sent: counts[0]?.sent ?? 0,
    draft: counts[0]?.draft ?? 0,
    rows: items.map((row) => ({
      id: row.id,
      title: row.title,
      clientName: row.client_name,
      status: row.status,
      changedAt: row.changed_at,
    })),
  };
}

export type ExportDriftSignal = { differences: string[] };

// The same comparison the systems board's drift banner makes (spec 0008, AC-9).
export async function getExportDriftSignal(): Promise<ExportDriftSignal> {
  return { differences: diffPublic(await getPublicProjection(), { products, productLinks }) };
}

export type StatusOverview = {
  clients: Record<ClientStatus, number>;
  contracts: Record<ContractStatus, number>;
  projects: Record<ProjectStatus, number>;
};

function tally<S extends string>(statuses: readonly S[], found: { status: string; count: number }[]): Record<S, number> {
  const counts = Object.fromEntries(statuses.map((status) => [status, 0])) as Record<S, number>;
  for (const row of found) {
    if ((statuses as readonly string[]).includes(row.status)) {
      counts[row.status as S] = row.count;
    }
  }
  return counts;
}

// Non archived rows per status in the workspace; a status with no rows is 0 (spec 0012, AC-8).
export async function getStatusOverview(): Promise<StatusOverview> {
  const workspace = await getWorkspaceId();
  const grouped = (table: "clients" | "contracts" | "projects") =>
    rows<{ status: string; count: number }>(
      getDb(),
      sql`select status,count(*)::int as count from ${sql.identifier("studio")}.${sql.identifier(table)} where workspace_id=${workspace}::uuid and archived_at is null group by status`,
    );
  const [clients, contracts, projects] = await Promise.all([grouped("clients"), grouped("contracts"), grouped("projects")]);
  return {
    clients: tally(CLIENT_STATUSES, clients),
    contracts: tally(CONTRACT_STATUSES, contracts),
    projects: tally(PROJECT_STATUSES, projects),
  };
}
