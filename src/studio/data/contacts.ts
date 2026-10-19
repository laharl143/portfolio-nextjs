import "server-only";
import "@/studio/marker";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { getDb, type Tx } from "@/studio/db/client";
import { clients, contacts } from "@/studio/db/schema";
import { ContactNotFound, DuplicateContactEmail, StaleRecord, isUniqueViolation } from "./errors";
import { isUuid, isVersion, parseContactInput, type ContactFormInput, type ContactValues } from "./input";
import { lockLiveClient } from "./clients";
import { getWorkspaceId } from "./workspace";

// Contacts of a client (spec 0006, AC-7). Every write runs in one transaction that locks the client row first.

export type Contact = typeof contacts.$inferSelect;

const EMAIL_CONSTRAINT = "contacts_client_email_uq";

function translateEmailRace(err: unknown): never {
  if (isUniqueViolation(err, EMAIL_CONSTRAINT)) {
    throw new DuplicateContactEmail();
  }
  throw err;
}

// Three ids must match: contact, its client, and the workspace. Archived contacts count as not found.
async function lockLiveContact(tx: Tx, clientId: string, contactId: string, workspaceId: string) {
  if (!isUuid(contactId)) {
    throw new ContactNotFound();
  }
  const [contact] = await tx
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.id, contactId),
        eq(contacts.clientId, clientId),
        eq(contacts.workspaceId, workspaceId),
        isNull(contacts.archivedAt),
      ),
    )
    .for("update");
  if (!contact) {
    throw new ContactNotFound();
  }
  return contact;
}

async function assertEmailFree(tx: Tx, clientId: string, email: string | null, exceptId?: string) {
  if (!email) {
    return;
  }
  const [taken] = await tx
    .select({ id: contacts.id })
    .from(contacts)
    .where(
      and(
        eq(contacts.clientId, clientId),
        isNull(contacts.archivedAt),
        sql`lower(${contacts.email}) = lower(${email})`,
        exceptId ? ne(contacts.id, exceptId) : undefined,
      ),
    )
    .limit(1);
  if (taken) {
    throw new DuplicateContactEmail();
  }
}

// Clears the previous live primary under the client lock. Moving its updated_at is on purpose:
// an edit form still open on it goes stale instead of quietly taking primary back.
async function clearOtherPrimary(tx: Tx, clientId: string, values: ContactValues, exceptId?: string) {
  if (!values.isPrimary) {
    return;
  }
  await tx
    .update(contacts)
    .set({ isPrimary: false })
    .where(
      and(
        eq(contacts.clientId, clientId),
        eq(contacts.isPrimary, true),
        isNull(contacts.archivedAt),
        exceptId ? ne(contacts.id, exceptId) : undefined,
      ),
    );
}

export async function getContactForEdit(clientId: string, contactId: string) {
  if (!isUuid(clientId) || !isUuid(contactId)) {
    throw new ContactNotFound();
  }
  const workspaceId = await getWorkspaceId();
  const [row] = await getDb()
    .select({
      id: contacts.id,
      fullName: contacts.fullName,
      email: contacts.email,
      phone: contacts.phone,
      preferredChannel: contacts.preferredChannel,
      isPrimary: contacts.isPrimary,
      version: sql<string>`${contacts.updatedAt}::text`,
      clientName: clients.name,
      clientArchivedAt: clients.archivedAt,
    })
    .from(contacts)
    .innerJoin(clients, eq(clients.id, contacts.clientId))
    .where(
      and(
        eq(contacts.id, contactId),
        eq(contacts.clientId, clientId),
        eq(contacts.workspaceId, workspaceId),
        eq(clients.workspaceId, workspaceId),
        isNull(contacts.archivedAt),
      ),
    );
  if (!row) {
    throw new ContactNotFound();
  }
  return row;
}

export async function createContact(clientId: string, input: ContactFormInput): Promise<Contact> {
  const values = parseContactInput(input);
  try {
    return await getDb().transaction(async (tx) => {
      const client = await lockLiveClient(tx, clientId);
      await assertEmailFree(tx, client.id, values.email);
      await clearOtherPrimary(tx, client.id, values);
      const [contact] = await tx
        .insert(contacts)
        .values({ workspaceId: client.workspaceId, clientId: client.id, ...values })
        .returning();
      return contact;
    });
  } catch (err) {
    translateEmailRace(err);
  }
}

export async function updateContact(
  clientId: string,
  contactId: string,
  version: string,
  input: ContactFormInput,
): Promise<Contact> {
  const values = parseContactInput(input);
  try {
    return await getDb().transaction(async (tx) => {
      const client = await lockLiveClient(tx, clientId);
      const contact = await lockLiveContact(tx, client.id, contactId, client.workspaceId);
      if (!isVersion(version)) {
        throw new StaleRecord();
      }
      await assertEmailFree(tx, client.id, values.email, contact.id);
      await clearOtherPrimary(tx, client.id, values, contact.id);
      const [updated] = await tx
        .update(contacts)
        .set(values)
        .where(and(eq(contacts.id, contact.id), sql`${contacts.updatedAt} = ${version}::timestamptz`))
        .returning();
      if (!updated) {
        throw new StaleRecord();
      }
      return updated;
    });
  } catch (err) {
    translateEmailRace(err);
  }
}

// No cascade. Archiving the primary leaves the client with none. An archived contact comes back unchanged.
export async function archiveContact(clientId: string, contactId: string): Promise<Contact> {
  return getDb().transaction(async (tx) => {
    const client = await lockLiveClient(tx, clientId);
    if (!isUuid(contactId)) {
      throw new ContactNotFound();
    }
    const [contact] = await tx
      .select()
      .from(contacts)
      .where(
        and(eq(contacts.id, contactId), eq(contacts.clientId, client.id), eq(contacts.workspaceId, client.workspaceId)),
      )
      .for("update");
    if (!contact) {
      throw new ContactNotFound();
    }
    if (contact.archivedAt) {
      return contact;
    }
    const [archived] = await tx
      .update(contacts)
      .set({ archivedAt: sql`now()` })
      .where(eq(contacts.id, contact.id))
      .returning();
    return archived;
  });
}
