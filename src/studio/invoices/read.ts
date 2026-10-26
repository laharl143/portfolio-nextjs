import "server-only";
import "@/studio/marker";
import { ContractNotFound, InvoiceNotFound, pgErrorOf } from "@/studio/data/errors";

type InvoiceRead =
  | "getBillingProfile"
  | "getInvoiceFile"
  | "getInvoiceView"
  | "getNewInvoiceDefaults"
  | "listClientInvoices"
  | "listContractInvoices"
  | "listInvoices";

class InvoiceReadFailed extends Error {
  constructor(operation: InvoiceRead, readonly code: string) {
    super(`${operation} failed (${code})`);
    this.name = "InvoiceReadFailed";
  }
}

// Next logs uncaught server errors, including their causes and extra properties. Keep only a fixed operation
// name and safe code here, never the original Drizzle error (which holds SQL, parameters, and driver details).
export function invoiceRead<Args extends unknown[], Result>(
  operation: InvoiceRead,
  read: (...args: Args) => Promise<Result>,
): (...args: Args) => Promise<Result> {
  return async (...args) => {
    try {
      return await read(...args);
    } catch (err) {
      if (err instanceof InvoiceNotFound || err instanceof ContractNotFound || err instanceof InvoiceReadFailed) {
        throw err;
      }
      throw new InvoiceReadFailed(operation, pgErrorOf(err)?.code ?? "UNEXPECTED");
    }
  };
}
