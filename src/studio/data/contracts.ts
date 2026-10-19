import "server-only";
import "@/studio/marker";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb, type Tx } from "@/studio/db/client";
import type { BillingCadence, ContractStatus } from "@/studio/db/constants";
import { clients, contracts, contractStatusEvents, projects } from "@/studio/db/schema";
import {
  ClientNotFound,
  ContractArchived,
  ContractNotArchivable,
  ContractNotFound,
  ContractStatusConflict,
  InvalidContractInput,
  InvalidContractTransition,
  ProjectNotFound,
} from "./errors";
import { getWorkspaceId } from "./workspace";

export type Contract = typeof contracts.$inferSelect;

// The allowed contract steps (spec 0004, AC-3). The only source changeContractStatus() and the contract screens read.
export const CONTRACT_TRANSITIONS: Record<ContractStatus, readonly ContractStatus[]> = {
  draft: ["sent", "cancelled"],
  sent: ["draft", "signed", "cancelled"],
  signed: ["active", "cancelled"],
  active: ["ended"],
  ended: [],
  cancelled: [],
};

const ARCHIVABLE_STATUSES: readonly ContractStatus[] = ["draft", "ended", "cancelled"];

export type CreateContractInput = {
  clientId: string;
  title: string;
  projectId?: string;
  amountMinor?: bigint | number;
  currency?: string;
  billingCadence?: BillingCadence;
  startDate?: string;
  endDate?: string;
  termsSummary?: string;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toAmountMinor(amount: bigint | number | undefined): bigint | null {
  if (amount === undefined) {
    return null;
  }
  if (typeof amount === "number" && !Number.isSafeInteger(amount)) {
    throw new InvalidContractInput("amount must be a whole number of centavos");
  }
  const value = BigInt(amount);
  if (value < BigInt(0)) {
    throw new InvalidContractInput("amount cannot be negative");
  }
  return value;
}

function toDate(value: string | undefined, label: string): string | null {
  if (value === undefined) {
    return null;
  }
  if (!DATE_PATTERN.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new InvalidContractInput(`${label} must be a YYYY-MM-DD date`);
  }
  return value;
}

function validateCreateInput(input: CreateContractInput) {
  const title = input.title.trim();
  if (!title) {
    throw new InvalidContractInput("title is required");
  }
  const currency = input.currency?.trim().toUpperCase();
  if (currency !== undefined && !/^[A-Z]{3}$/.test(currency)) {
    throw new InvalidContractInput("currency must be three letters");
  }
  const startDate = toDate(input.startDate, "start date");
  const endDate = toDate(input.endDate, "end date");
  if (startDate && endDate && endDate < startDate) {
    throw new InvalidContractInput("end date is before start date");
  }
  return {
    title,
    currency,
    startDate,
    endDate,
    amountMinor: toAmountMinor(input.amountMinor),
    termsSummary: input.termsSummary?.trim() || null,
  };
}

// Lock order is always client row, then contract row (spec 0004).
async function lockClient(tx: Tx, clientId: string, workspaceId: string) {
  const [client] = await tx
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.workspaceId, workspaceId)))
    .for("update");
  return client;
}

async function lockContract(tx: Tx, contractId: string, workspaceId: string) {
  const [contract] = await tx
    .select()
    .from(contracts)
    .where(and(eq(contracts.id, contractId), eq(contracts.workspaceId, workspaceId)))
    .for("update");
  return contract;
}

// Finds the contract's client (it never changes), then takes both locks in order.
async function lockClientThenContract(tx: Tx, contractId: string, workspaceId: string) {
  const [found] = await tx
    .select({ clientId: contracts.clientId })
    .from(contracts)
    .where(and(eq(contracts.id, contractId), eq(contracts.workspaceId, workspaceId)));
  if (!found) {
    throw new ContractNotFound();
  }
  await lockClient(tx, found.clientId, workspaceId);
  const contract = await lockContract(tx, contractId, workspaceId);
  if (!contract) {
    throw new ContractNotFound();
  }
  return contract;
}

// Inserts a draft contract and its opening event in one transaction (spec 0004, AC-3).
// `opts.id` is for the seed only, so its rows keep fixed ids.
export async function createContract(input: CreateContractInput, opts: { id?: string } = {}): Promise<Contract> {
  const values = validateCreateInput(input);
  const workspaceId = await getWorkspaceId();

  return getDb().transaction(async (tx) => {
    const client = await lockClient(tx, input.clientId, workspaceId);
    if (!client || client.archivedAt) {
      throw new ClientNotFound();
    }

    if (input.projectId) {
      const [project] = await tx
        .select({ id: projects.id })
        .from(projects)
        .where(
          and(
            eq(projects.id, input.projectId),
            eq(projects.clientId, client.id),
            eq(projects.workspaceId, client.workspaceId),
            isNull(projects.archivedAt),
          ),
        );
      if (!project) {
        throw new ProjectNotFound();
      }
    }

    const [contract] = await tx
      .insert(contracts)
      .values({
        ...(opts.id ? { id: opts.id } : {}),
        workspaceId: client.workspaceId,
        clientId: client.id,
        projectId: input.projectId ?? null,
        title: values.title,
        status: "draft",
        amountMinor: values.amountMinor,
        ...(values.currency ? { currency: values.currency } : {}),
        billingCadence: input.billingCadence ?? null,
        startDate: values.startDate,
        endDate: values.endDate,
        termsSummary: values.termsSummary,
      })
      .returning();

    await tx.insert(contractStatusEvents).values({
      workspaceId: contract.workspaceId,
      contractId: contract.id,
      fromStatus: null,
      toStatus: "draft",
    });

    return contract;
  });
}

// The one way a contract's status changes (spec 0004, AC-3 and AC-4): one step from CONTRACT_TRANSITIONS,
// the contract update and its event row in one transaction, under the client then contract row locks.
export async function changeContractStatus(input: {
  contractId: string;
  to: ContractStatus;
  note?: string;
}): Promise<Contract> {
  const workspaceId = await getWorkspaceId();
  const note = input.note?.trim() || null;

  return getDb().transaction(async (tx) => {
    const current = await lockClientThenContract(tx, input.contractId, workspaceId);
    if (current.archivedAt) {
      throw new ContractArchived();
    }
    if (!CONTRACT_TRANSITIONS[current.status].includes(input.to)) {
      throw new InvalidContractTransition(current.status, input.to);
    }

    const [updated] = await tx
      .update(contracts)
      .set({ status: input.to })
      .where(and(eq(contracts.id, current.id), eq(contracts.status, current.status)))
      .returning();
    if (!updated) {
      throw new ContractStatusConflict();
    }

    await tx.insert(contractStatusEvents).values({
      workspaceId: current.workspaceId,
      contractId: current.id,
      fromStatus: current.status,
      toStatus: input.to,
      note,
    });

    return updated;
  });
}

// Archives a draft, ended, or cancelled contract (spec 0004, AC-6). An archived contract comes back unchanged.
export async function archiveContract(contractId: string): Promise<Contract> {
  const workspaceId = await getWorkspaceId();

  return getDb().transaction(async (tx) => {
    const contract = await lockClientThenContract(tx, contractId, workspaceId);
    if (contract.archivedAt) {
      return contract;
    }
    if (!ARCHIVABLE_STATUSES.includes(contract.status)) {
      throw new ContractNotArchivable(contract.status);
    }
    const [archived] = await tx
      .update(contracts)
      .set({ archivedAt: sql`now()` })
      .where(eq(contracts.id, contract.id))
      .returning();
    return archived;
  });
}
