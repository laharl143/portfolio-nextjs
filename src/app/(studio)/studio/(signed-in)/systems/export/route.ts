import { requireStudioAccess } from "@/studio/guard";
import { buildPublicProductsFile } from "@/studio/systems/export";
import { getPublicProjection } from "@/studio/systems/projection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// "Export public file" (spec 0008, AC-10): downloads a fresh `products-data.ts` built only from the public projection.
// With nothing to export it answers 409, so the public page is never emptied by accident.
export async function GET() {
  await requireStudioAccess();
  let projection: Awaited<ReturnType<typeof getPublicProjection>>;
  try {
    projection = await getPublicProjection();
  } catch (err) {
    console.error("[studio] systems export route", err instanceof Error ? err.constructor.name : "UNEXPECTED");
    throw err;
  }
  if (projection.systems.length === 0) {
    return new Response("Nothing to export: no published live systems.\n", {
      status: 409,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  return new Response(buildPublicProductsFile(projection), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="products-data.ts"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
