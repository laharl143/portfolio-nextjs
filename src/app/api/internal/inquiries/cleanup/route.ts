import { authorizeCleanup, cleanupInquiries } from "@/inquiries/cleanup";
import { IntakeError } from "@/inquiries/rules";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: Request) {
  try {
    return Response.json(await cleanupInquiries(authorizeCleanup(request)), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const safe =
      error instanceof IntakeError
        ? error
        : new IntakeError("UNAVAILABLE", 503);
    return Response.json(
      { code: safe.code },
      { status: safe.status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
