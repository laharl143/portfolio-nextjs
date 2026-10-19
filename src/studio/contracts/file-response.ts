import "server-only";
import "@/studio/marker";

// Headers for every contract file response (spec 0007, AC-11). Generated PDFs are served inline; uploaded signed
// copies are untrusted content and always download as attachments.
export function pdfResponse(
  body: ReadableStream<Uint8Array> | Buffer,
  opts: { filename: string; disposition: "inline" | "attachment"; size?: number },
): Response {
  const headers = new Headers({
    "Content-Type": "application/pdf",
    "Content-Disposition": `${opts.disposition}; filename="${opts.filename}"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  if (opts.size !== undefined) {
    headers.set("Content-Length", String(opts.size));
  }
  return new Response(body instanceof Buffer ? new Uint8Array(body) : body, { headers });
}
