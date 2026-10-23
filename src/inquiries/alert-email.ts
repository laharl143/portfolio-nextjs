import "server-only";

const FORMAT = "portfolio-alert-v1\n";
type EmailContent = { text: string; html?: string };

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Adapted from Vital Stats' renderNotificationEmail. No visitor data enters email.
// Freeze both representations in the existing body column for byte identical retries.
export function createAlertBody(inquiryUrl: string): string {
  const link = escapeHtml(inquiryUrl);
  const text = `A new project inquiry is available in your private studio.\n\n${inquiryUrl}`;
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>New portfolio inquiry</title></head>
<body style="margin:0;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;background:#f7f8fb;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #dfe3e8;">
    <tr><td style="background:#14263f;padding:20px 28px;">
      <table role="presentation" width="100%"><tr>
        <td style="color:#ffffff;font-size:15px;font-weight:700;letter-spacing:0.02em;">ED SOLUTIONS</td>
        <td align="right" style="color:#ffffff;font-size:12px;">New submission</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:28px;">
      <h1 style="margin:0 0 16px;font-size:19px;color:#202124;">New portfolio inquiry</h1>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#59616b;">A new project inquiry is available in your private studio.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;"><tr><td style="background:#2563eb;border-radius:6px;">
        <a href="${link}" style="display:inline-block;padding:11px 20px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">View inquiry</a>
      </td></tr></table>
      <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#59616b;">Sign in to your studio to review the details.</p>
      <p style="margin:12px 0 0;font-size:12px;line-height:1.6;color:#59616b;overflow-wrap:anywhere;">If the button does not work, open:<br><a href="${link}" style="color:#2563eb;word-break:break-all;">${link}</a></p>
    </td></tr>
  </table>
</body></html>`;
  return FORMAT + JSON.stringify({ text, html });
}

export function readAlertBody(body: string): EmailContent {
  if (!body.startsWith(FORMAT)) return { text: body };
  const content: unknown = JSON.parse(body.slice(FORMAT.length));
  if (!content || typeof content !== "object" ||
    !("text" in content) || typeof content.text !== "string" ||
    !("html" in content) || typeof content.html !== "string") {
    throw new Error("INVALID_ALERT_BODY");
  }
  return { text: content.text, html: content.html };
}
