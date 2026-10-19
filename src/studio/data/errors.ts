import "server-only";
import "@/studio/marker";

// Every studio data error carries a stable `code`, so server actions can return codes instead of class instances (spec 0004).
export class StudioDataError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ClientNotFound extends StudioDataError {
  constructor() {
    super("CLIENT_NOT_FOUND", "Client not found");
  }
}

export class ClientHasLiveContracts extends StudioDataError {
  constructor() {
    super("CLIENT_HAS_LIVE_CONTRACTS", "Client has a signed or active contract");
  }
}

export class ProjectNotFound extends StudioDataError {
  constructor() {
    super("PROJECT_NOT_FOUND", "Project not found for this client");
  }
}

export class ContractNotFound extends StudioDataError {
  constructor() {
    super("CONTRACT_NOT_FOUND", "Contract not found");
  }
}

export class InvalidContractInput extends StudioDataError {
  constructor(detail: string) {
    super("INVALID_CONTRACT_INPUT", `Invalid contract input: ${detail}`);
  }
}

export class InvalidContractTransition extends StudioDataError {
  constructor(from: string, to: string) {
    super("INVALID_CONTRACT_TRANSITION", `A contract cannot move from ${from} to ${to}`);
  }
}

export class ContractStatusConflict extends StudioDataError {
  constructor() {
    super("CONTRACT_STATUS_CONFLICT", "The contract status changed while this change was running");
  }
}

export class ContractArchived extends StudioDataError {
  constructor() {
    super("CONTRACT_ARCHIVED", "The contract is archived");
  }
}

export class ContractNotArchivable extends StudioDataError {
  constructor(status: string) {
    super("CONTRACT_NOT_ARCHIVABLE", `A ${status} contract cannot be archived`);
  }
}

// Client tracking (spec 0006).

export class InvalidInput extends StudioDataError {
  constructor(readonly fieldErrors: Record<string, string>) {
    super("INVALID_INPUT", "Invalid input");
  }
}

export class DuplicateClientName extends StudioDataError {
  constructor() {
    super("DUPLICATE_CLIENT_NAME", "Another client already has this name");
  }
}

export class DuplicateContactEmail extends StudioDataError {
  constructor() {
    super("DUPLICATE_CONTACT_EMAIL", "Another contact of this client already uses this email");
  }
}

export class StaleRecord extends StudioDataError {
  constructor() {
    super("STALE_RECORD", "The record changed since it was read");
  }
}

export class ClientArchived extends StudioDataError {
  constructor() {
    super("CLIENT_ARCHIVED", "The client is archived");
  }
}

export class ContactNotFound extends StudioDataError {
  constructor() {
    super("CONTACT_NOT_FOUND", "Contact not found for this client");
  }
}

export class NoteNotFound extends StudioDataError {
  constructor() {
    super("NOTE_NOT_FOUND", "Note not found for this client");
  }
}

export class ProjectHasLiveContracts extends StudioDataError {
  constructor() {
    super("PROJECT_HAS_LIVE_CONTRACTS", "Project has a signed or active contract");
  }
}

export type PgError = { code: string; constraint?: string };

// Drizzle 0.45 wraps driver errors (DrizzleQueryError), so walk `cause` until an object carries a Postgres `code`.
export function pgErrorOf(err: unknown): PgError | null {
  let current: unknown = err;
  for (let depth = 0; current && typeof current === "object" && depth < 5; depth++) {
    const candidate = current as { code?: unknown; constraint?: unknown; cause?: unknown };
    if (typeof candidate.code === "string" && /^[0-9A-Z]{5}$/.test(candidate.code)) {
      return {
        code: candidate.code,
        constraint: typeof candidate.constraint === "string" ? candidate.constraint : undefined,
      };
    }
    current = candidate.cause;
  }
  return null;
}

// True for a unique violation on the named constraint.
export function isUniqueViolation(err: unknown, constraint: string): boolean {
  const pg = pgErrorOf(err);
  return pg?.code === "23505" && pg.constraint === constraint;
}
