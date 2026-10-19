import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { STUDIO_PATH_HEADER } from "@/studio/auth/cookie";
import { safeNext } from "@/studio/auth/safe-next";
import { getStudioSession, type StudioSession } from "@/studio/auth/session";

// Flag only (spec 0003). The login and setup pages and their actions call this, never requireStudioAccess().
export async function requireStudioEnabled(): Promise<void> {
  if (process.env.STUDIO_ENABLED !== "true") {
    notFound();
  }
}

// The one gate every signed in layout, page, route handler, and server action calls first (specs 0003, 0005).
// The proxy is only a first filter: server actions can be POSTed to any route path.
export async function requireStudioAccess(): Promise<StudioSession> {
  await requireStudioEnabled();
  const session = await getStudioSession();
  if (!session) {
    const next = safeNext((await headers()).get(STUDIO_PATH_HEADER));
    redirect(`/studio/login?next=${encodeURIComponent(next)}`);
  }
  return session;
}
