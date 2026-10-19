import "server-only";
import "@/studio/marker";
import { alias } from "drizzle-orm/pg-core";
import { and, asc, desc, eq, inArray, isNotNull, isNull, ne, sql, type SQL } from "drizzle-orm";
import { getDb, type Tx } from "@/studio/db/client";
import type { ClientStatus } from "@/studio/db/constants";
import { clients, contacts, contracts, notes, projects } from "@/studio/db/schema";
import {
  ClientArchived,
  ClientHasLiveContracts,
  ClientNotFound,
  DuplicateClientName,
  StaleRecord,
  isUniqueViolation,
} from "./errors";
import { isUuid, isVersion, parseClientInput, type ClientFormInput } from "./input";
import { getWorkspaceId } from "./workspace";

export type Client = typeof clients.$inferSelect;

export const CLIENT_PAGE_SIZE = 50;
export const NOTE_LIMIT = 100;
const NAME_CONSTRAINT = "clients_workspace_name_uq";

// The row's version for the edit forms (spec 0006): full microsecond text, never a JS Date.
const clientVersion = sql<string>`${clients.updatedAt}::text`;

// Locks the client row (spec 0006). Every write on a contact, project, or note calls this first,
// so the lock order is always client, then child, matching archiveClient.
export async function lockLiveClient(tx: Tx, clientId: string): Promise<Client> {
  if (!isUuid(clientId)) {
    throw new ClientNotFound();
  }
  const workspaceId = await getWorkspaceId();
  const [client] = await tx
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.workspaceId, workspaceId)))
    .for("update");
  if (!client) {
    throw new ClientNotFound();
  }
  if (client.archivedAt) {
    throw new ClientArchived();
  }
  return client;
}

export type ClientRow = {
  id: string;
  name: string;
  status: ClientStatus;
  industry: string | null;
  primaryContactName: string | null;
  lastActivityAt: Date;
};

export type ClientList = { rows: ClientRow[]; total: number; page: number; pageSize: number };

// `%`, `_`, and `\` match literally.
function likePattern(q: string): string {
  return `%${q.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
}

// The client list (spec 0006, AC-2 and AC-3). Inputs arrive already parsed from the URL.
export async function listClients(opts: {
  q?: string;
  status?: ClientStatus;
  archived: boolean;
  page: number;
}): Promise<ClientList> {
  const workspaceId = await getWorkspaceId();
  const conditions: SQL[] = [
    eq(clients.workspaceId, workspaceId),
    opts.archived ? isNotNull(clients.archivedAt) : isNull(clients.archivedAt),
  ];
  if (opts.q) {
    conditions.push(sql`lower(${clients.name}) like lower(${likePattern(opts.q)}) escape '\\'`);
  }
  if (opts.status) {
    conditions.push(eq(clients.status, opts.status));
  }
  const where = and(...conditions);

  // Latest change to the client or any of its rows, archived children included.
  const latest = (table: typeof contacts | typeof projects | typeof notes) =>
    sql`(select max(${table.updatedAt}) from ${table} where ${table.clientId} = ${clients.id} and ${table.workspaceId} = ${workspaceId})`;
  const lastActivity = sql`greatest(${clients.updatedAt}, ${latest(contacts)}, ${latest(projects)}, ${latest(notes)})`;

  const primary = alias(contacts, "primary_contact");
  const db = getDb();

  const [rows, [counted]] = await Promise.all([
    db
      .select({
        id: clients.id,
        name: clients.name,
        status: clients.status,
        industry: clients.industry,
        primaryContactName: primary.fullName,
        lastActivityAt: lastActivity.mapWith(clients.updatedAt),
      })
      .from(clients)
      .leftJoin(
        primary,
        and(eq(primary.clientId, clients.id), eq(primary.isPrimary, true), isNull(primary.archivedAt)),
      )
      .where(where)
      .orderBy(sql`lower(${clients.name})`, asc(clients.id))
      .limit(CLIENT_PAGE_SIZE)
      .offset((opts.page - 1) * CLIENT_PAGE_SIZE),
    db.select({ total: sql<number>`count(*)::int` }).from(clients).where(where),
  ]);

  return { rows, total: counted?.total ?? 0, page: opts.page, pageSize: CLIENT_PAGE_SIZE };
}

async function findClient(clientId: string) {
  if (!isUuid(clientId)) {
    throw new ClientNotFound();
  }
  const workspaceId = await getWorkspaceId();
  const [client] = await getDb()
    .select({
      id: clients.id,
      name: clients.name,
      status: clients.status,
      website: clients.website,
      industry: clients.industry,
      archivedAt: clients.archivedAt,
      version: clientVersion,
    })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.workspaceId, workspaceId)));
  if (!client) {
    throw new ClientNotFound();
  }
  return { client, workspaceId };
}

export type ClientForEdit = Awaited<ReturnType<typeof findClient>>["client"];

export async function getClientForEdit(clientId: string): Promise<ClientForEdit> {
  return (await findClient(clientId)).client;
}

// One client with its live contacts, live projects, and latest notes (spec 0006, AC-6 to AC-9).
export async function getClientDetail(clientId: string) {
  const { client, workspaceId } = await findClient(clientId);
  const db = getDb();

  const [contactRows, projectRows, noteRows, [noteCount]] = await Promise.all([
    db
      .select({
        id: contacts.id,
        fullName: contacts.fullName,
        email: contacts.email,
        phone: contacts.phone,
        preferredChannel: contacts.preferredChannel,
        isPrimary: contacts.isPrimary,
      })
      .from(contacts)
      .where(
        and(eq(contacts.clientId, client.id), eq(contacts.workspaceId, workspaceId), isNull(contacts.archivedAt)),
      )
      .orderBy(desc(contacts.isPrimary), sql`lower(${contacts.fullName})`, asc(contacts.id)),
    db
      .select({
        id: projects.id,
        name: projects.name,
        status: projects.status,
        description: projects.description,
        startDate: projects.startDate,
        targetEndDate: projects.targetEndDate,
        actualEndDate: projects.actualEndDate,
      })
      .from(projects)
      .where(
        and(eq(projects.clientId, client.id), eq(projects.workspaceId, workspaceId), isNull(projects.archivedAt)),
      )
      .orderBy(sql`lower(${projects.name})`, asc(projects.id)),
    db
      .select({ id: notes.id, body: notes.body, createdAt: notes.createdAt, updatedAt: notes.updatedAt })
      .from(notes)
      .where(and(eq(notes.clientId, client.id), eq(notes.workspaceId, workspaceId)))
      .orderBy(desc(notes.createdAt), desc(notes.id))
      .limit(NOTE_LIMIT),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(notes)
      .where(and(eq(notes.clientId, client.id), eq(notes.workspaceId, workspaceId))),
  ]);

  return {
    client,
    contacts: contactRows,
    projects: projectRows,
    notes: noteRows,
    noteTotal: noteCount?.total ?? 0,
  };
}

export type ClientDetail = Awaited<ReturnType<typeof getClientDetail>>;

// The app check gives the field error; the unique index settles a race.
async function assertNameFree(tx: Tx, workspaceId: string, name: string, exceptId?: string) {
  const [taken] = await tx
    .select({ id: clients.id })
    .from(clients)
    .where(
      and(
        eq(clients.workspaceId, workspaceId),
        isNull(clients.archivedAt),
        sql`lower(${clients.name}) = lower(${name})`,
        exceptId ? ne(clients.id, exceptId) : undefined,
      ),
    )
    .limit(1);
  if (taken) {
    throw new DuplicateClientName();
  }
}

function translateNameRace(err: unknown): never {
  if (isUniqueViolation(err, NAME_CONSTRAINT)) {
    throw new DuplicateClientName();
  }
  throw err;
}

export async function createClient(input: ClientFormInput): Promise<Client> {
  const values = parseClientInput(input);
  const workspaceId = await getWorkspaceId();
  try {
    return await getDb().transaction(async (tx) => {
      await assertNameFree(tx, workspaceId, values.name);
      const [client] = await tx
        .insert(clients)
        .values({ workspaceId, ...values })
        .returning();
      return client;
    });
  } catch (err) {
    translateNameRace(err);
  }
}

// Applies only to the exact version the form saw (spec 0006, AC-5).
export async function updateClient(clientId: string, version: string, input: ClientFormInput): Promise<Client> {
  const values = parseClientInput(input);
  const workspaceId = await getWorkspaceId();
  try {
    return await getDb().transaction(async (tx) => {
      const client = await lockLiveClient(tx, clientId);
      if (!isVersion(version)) {
        throw new StaleRecord();
      }
      await assertNameFree(tx, workspaceId, values.name, client.id);
      const [updated] = await tx
        .update(clients)
        .set(values)
        .where(
          and(
            eq(clients.id, client.id),
            eq(clients.workspaceId, workspaceId),
            sql`${clients.updatedAt} = ${version}::timestamptz`,
          ),
        )
        .returning();
      if (!updated) {
        throw new StaleRecord();
      }
      return updated;
    });
  } catch (err) {
    translateNameRace(err);
  }
}

// Archives a client (spec 0004, AC-6). Refuses while it has a signed or active contract; the client row
// is locked first, so no contract of it can become signed meanwhile. No cascade; an archived client comes back unchanged.
export async function archiveClient(clientId: string): Promise<Client> {
  if (!isUuid(clientId)) {
    throw new ClientNotFound();
  }
  const workspaceId = await getWorkspaceId();

  return getDb().transaction(async (tx) => {
    const [client] = await tx
      .select()
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.workspaceId, workspaceId)))
      .for("update");
    if (!client) {
      throw new ClientNotFound();
    }
    if (client.archivedAt) {
      return client;
    }

    const [live] = await tx
      .select({ id: contracts.id })
      .from(contracts)
      .where(
        and(
          eq(contracts.clientId, client.id),
          eq(contracts.workspaceId, workspaceId),
          inArray(contracts.status, ["signed", "active"]),
          isNull(contracts.archivedAt),
        ),
      )
      .limit(1);
    if (live) {
      throw new ClientHasLiveContracts();
    }

    const [archived] = await tx
      .update(clients)
      .set({ archivedAt: sql`now()` })
      .where(eq(clients.id, client.id))
      .returning();
    return archived;
  });
}
