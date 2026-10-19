import "server-only";
import { notFound } from "next/navigation";

// The one gate every studio layout, page, route handler, and server action calls first (spec 0003).
// The proxy is only a first filter: server actions can be POSTed to any route path.
// Feature 21 (studio login) adds the owner session check here.
export async function requireStudioAccess(): Promise<void> {
  if (process.env.STUDIO_ENABLED !== "true") {
    notFound();
  }
}
