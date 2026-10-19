import "server-only";
import "@/studio/marker";
import { notFound } from "next/navigation";
import {
  ClientNotFound,
  ContactNotFound,
  ContractFileNotFound,
  ContractNotFound,
  NoteNotFound,
  ProjectNotFound,
  SystemLinkNotFound,
  SystemNotFound,
  SystemResourceNotFound,
  TemplateNotFound,
} from "@/studio/data/errors";

// Pages and file routes call this in their catch (specs 0006, 0007, and 0008): a missing, malformed, foreign, or archived
// child id shows the studio
// not found page; anything else goes on to error.tsx.
export function notFoundOr(err: unknown): never {
  if (
    err instanceof ClientNotFound ||
    err instanceof ContactNotFound ||
    err instanceof ProjectNotFound ||
    err instanceof NoteNotFound ||
    err instanceof ContractNotFound ||
    err instanceof ContractFileNotFound ||
    err instanceof TemplateNotFound ||
    err instanceof SystemNotFound ||
    err instanceof SystemLinkNotFound ||
    err instanceof SystemResourceNotFound
  ) {
    notFound();
  }
  throw err;
}
