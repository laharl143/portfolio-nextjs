import { ingest } from "@/inquiries/ingest";
import { attemptAlert } from "@/inquiries/alerts";
import { IntakeError } from "@/inquiries/rules";
import { getIntakeConfig } from "@/inquiries/config";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const config = getIntakeConfig();
    const result = await ingest(
      request,
      config.production ? undefined : { config, address: "192.0.2.1" },
    );
    if (result.id)
      await attemptAlert(
        result.id,
        result.config.workspaceId,
        result.config,
      ).catch(() => {
        console.error("inquiry alert: ATTEMPT_FAILED");
      });
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const safe =
      error instanceof IntakeError
        ? error
        : new IntakeError("UNAVAILABLE", 503);
    return Response.json(
      { ok: false, code: safe.code, fieldErrors: safe.fieldErrors },
      { status: safe.status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
