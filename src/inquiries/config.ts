import "server-only";
import { isIP } from "node:net";
import { SITE_URL } from "@/lib/site";
import { getPublicIntakeConfig } from "./public-config";
import { IntakeError, UUID } from "./rules";

export type IntakeConfig = {
  workspaceId: string;
  origin: string;
  turnstileSecret: string;
  resendKey: string;
  sender: string;
  recipient: string;
  rateSecret: string;
  production: boolean;
};
export type AlertConfig = Pick<
  IntakeConfig,
  "resendKey" | "sender" | "recipient" | "production"
>;
export function getAlertConfig(): AlertConfig {
  const production = process.env.VERCEL_ENV === "production";
  if (
    (process.env.VERCEL_ENV && !production) ||
    (!production && process.env.NODE_ENV === "production")
  )
    throw new IntakeError("UNAVAILABLE", 503);
  const resendKey = process.env.RESEND_API_KEY,
    sender = process.env.INQUIRY_ALERT_FROM,
    recipient = process.env.INQUIRY_ALERT_TO;
  if (
    !resendKey ||
    !sender ||
    !recipient ||
    (!production && recipient !== "delivered@resend.dev")
  )
    throw new IntakeError("UNAVAILABLE", 503);
  return { resendKey, sender, recipient, production };
}
export function getIntakeConfig(): IntakeConfig {
  if (!getPublicIntakeConfig().enabled)
    throw new IntakeError("UNAVAILABLE", 503);
  const value = (key: string) => {
    const v = process.env[key];
    if (!v) throw new IntakeError("UNAVAILABLE", 503);
    return v;
  };
  const production = process.env.VERCEL_ENV === "production";
  const workspaceId = value("LEAD_INTAKE_WORKSPACE_ID");
  const origin = value("LEAD_INTAKE_ORIGIN");
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    throw new IntakeError("UNAVAILABLE", 503);
  }
  const turnstileSecret = value("TURNSTILE_SECRET_KEY");
  if (production && (turnstileSecret.startsWith("1x000000") || turnstileSecret.startsWith("2x000000") || turnstileSecret.startsWith("3x000000"))) throw new IntakeError("UNAVAILABLE",503);
  const rateSecret = value("INQUIRY_RATE_SECRET");
  const cron = value("CRON_SECRET");
  value("TURNSTILE_SITE_KEY");
  value("DATABASE_URL");
  if (
    !UUID.test(workspaceId) ||
    url.origin !== origin ||
    (production
      ? origin !== SITE_URL || url.protocol !== "https:"
      : url.hostname !== "localhost") ||
    Buffer.byteLength(rateSecret) < 32 ||
    Buffer.byteLength(cron) < 32
  )
    throw new IntakeError("UNAVAILABLE", 503);
  // Local verification may only use Cloudflare's published test secret and Resend test behavior.
  if (
    !production &&
    (turnstileSecret !== "1x0000000000000000000000000000000AA" ||
      value("INQUIRY_ALERT_TO") !== "delivered@resend.dev")
  )
    throw new IntakeError("UNAVAILABLE", 503);
  return {
    workspaceId,
    origin,
    turnstileSecret,
    resendKey: value("RESEND_API_KEY"),
    sender: value("INQUIRY_ALERT_FROM"),
    recipient: value("INQUIRY_ALERT_TO"),
    rateSecret,
    production,
  };
}
export function trustedAddress(headers: Headers): string {
  if (process.env.VERCEL !== "1" || process.env.VERCEL_ENV !== "production")
    throw new IntakeError("UNAVAILABLE", 503);
  const address = headers.get("x-vercel-forwarded-for")?.trim() ?? "";
  if (!isIP(address)) throw new IntakeError("INVALID_ADDRESS", 403);
  return isIP(address) === 6
    ? new URL(`http://[${address}]/`).hostname.slice(1, -1)
    : address;
}
