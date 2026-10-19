import "server-only";
import "@/studio/marker";

// The owner inserted by migration 0005 (spec 0005). A code constant, not a secret. Also the WebAuthn user handle.
export const STUDIO_OWNER_ID = "00000000-0000-4000-8000-000000000002";

// Shown in the passkey prompt and stored by password managers. Never differs by environment.
export const STUDIO_RP_NAME = "Erskine Studio";

export const SESSION_DAYS = 30;
export const SESSION_SLIDE_AFTER_HOURS = 24;
export const CHALLENGE_MINUTES = 5;
export const EVENT_RETENTION_DAYS = 90;
export const SETUP_LOCK_ATTEMPTS = 5;
export const SETUP_LOCK_MINUTES = 15;
const MIN_SETUP_TOKEN_LENGTH = 32;

// Fails loudly when the passkey domain is not configured: a studio with no RP config cannot sign anyone in.
export function getRpConfig(): { rpID: string; origin: string } {
  const rpID = process.env.STUDIO_RP_ID;
  const origin = process.env.STUDIO_ORIGIN;
  if (!rpID || !origin) {
    throw new Error("STUDIO_RP_ID and STUDIO_ORIGIN must be set to use studio login");
  }
  return { rpID, origin };
}

// The setup token, or null when unset or shorter than 32 characters (both mean setup is closed).
export function getSetupToken(): string | null {
  const token = process.env.STUDIO_SETUP_TOKEN ?? "";
  return token.length >= MIN_SETUP_TOKEN_LENGTH ? token : null;
}
