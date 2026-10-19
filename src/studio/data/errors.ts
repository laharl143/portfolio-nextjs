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
