import "server-only";
import "@/studio/marker";
import { and, eq, sql } from "drizzle-orm";
import { getDb, type Tx } from "@/studio/db/client";
import { clients, notes } from "@/studio/db/schema";
import { NoteNotFound, StaleRecord } from "./errors";
import { isUuid, isVersion, parseNoteBody } from "./input";
import { lockLiveClient } from "./clients";
import { getWorkspaceId } from "./workspace";

// Client notes (spec 0006, AC-9). Editable and hard deleted (spec 0004); every write locks the client row first.

export type Note = typeof notes.$inferSelect;

async function lockNote(tx: Tx, clientId: string, noteId: string, workspaceId: string) {
  if (!isUuid(noteId)) {
    throw new NoteNotFound();
  }
  const [note] = await tx
    .select()
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.clientId, clientId), eq(notes.workspaceId, workspaceId)))
    .for("update");
  if (!note) {
    throw new NoteNotFound();
  }
  return note;
}

export async function getNoteForEdit(clientId: string, noteId: string) {
  if (!isUuid(clientId) || !isUuid(noteId)) {
    throw new NoteNotFound();
  }
  const workspaceId = await getWorkspaceId();
  const [row] = await getDb()
    .select({
      id: notes.id,
      body: notes.body,
      version: sql<string>`${notes.updatedAt}::text`,
      clientName: clients.name,
      clientArchivedAt: clients.archivedAt,
    })
    .from(notes)
    .innerJoin(clients, eq(clients.id, notes.clientId))
    .where(
      and(
        eq(notes.id, noteId),
        eq(notes.clientId, clientId),
        eq(notes.workspaceId, workspaceId),
        eq(clients.workspaceId, workspaceId),
      ),
    );
  if (!row) {
    throw new NoteNotFound();
  }
  return row;
}

export async function createClientNote(clientId: string, rawBody: string): Promise<Note> {
  const body = parseNoteBody(rawBody);
  return getDb().transaction(async (tx) => {
    const client = await lockLiveClient(tx, clientId);
    const [note] = await tx
      .insert(notes)
      .values({ workspaceId: client.workspaceId, clientId: client.id, body })
      .returning();
    return note;
  });
}

export async function updateNote(clientId: string, noteId: string, version: string, rawBody: string): Promise<Note> {
  const body = parseNoteBody(rawBody);
  return getDb().transaction(async (tx) => {
    const client = await lockLiveClient(tx, clientId);
    const note = await lockNote(tx, client.id, noteId, client.workspaceId);
    if (!isVersion(version)) {
      throw new StaleRecord();
    }
    const [updated] = await tx
      .update(notes)
      .set({ body })
      .where(and(eq(notes.id, note.id), sql`${notes.updatedAt} = ${version}::timestamptz`))
      .returning();
    if (!updated) {
      throw new StaleRecord();
    }
    return updated;
  });
}

export async function deleteNote(clientId: string, noteId: string): Promise<void> {
  await getDb().transaction(async (tx) => {
    const client = await lockLiveClient(tx, clientId);
    const note = await lockNote(tx, client.id, noteId, client.workspaceId);
    await tx.delete(notes).where(eq(notes.id, note.id));
  });
}
