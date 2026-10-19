import "server-only";
import "@/studio/marker";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "@/studio/db/client";
import { clients, contracts } from "@/studio/db/schema";
import { ClientHasLiveContracts, ClientNotFound } from "./errors";
import { getWorkspaceId } from "./workspace";

export type Client = typeof clients.$inferSelect;

// Archives a client (spec 0004, AC-6). Refuses while it has a signed or active contract; the client row
// is locked first, so no contract of it can become signed meanwhile. No cascade; an archived client comes back unchanged.
export async function archiveClient(clientId: string): Promise<Client> {
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
