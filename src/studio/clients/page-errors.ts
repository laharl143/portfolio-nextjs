import "server-only";
import "@/studio/marker";
import { notFound } from "next/navigation";
import { ClientNotFound, ContactNotFound, NoteNotFound, ProjectNotFound } from "@/studio/data/errors";

// Pages call this in their catch (spec 0006): a missing, malformed, foreign, or archived child id shows the studio
// not found page; anything else goes on to error.tsx.
export function notFoundOr(err: unknown): never {
  if (
    err instanceof ClientNotFound ||
    err instanceof ContactNotFound ||
    err instanceof ProjectNotFound ||
    err instanceof NoteNotFound
  ) {
    notFound();
  }
  throw err;
}
