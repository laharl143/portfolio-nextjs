import type { AuthErrorCode } from "@/studio/auth/actions";

// The only user facing auth text (spec 0005, Messages table).
export type Surface = "login" | "setup" | "security";

export const UNSUPPORTED = "This browser does not support passkeys.";
export const WAITING = "Waiting for your passkey…";
export const PASSKEY_ADDED = "Passkey added.";

export function cancelledMessage(surface: Surface): string {
  return surface === "login" ? "Sign in was cancelled. Try again." : "Passkey setup was cancelled. Try again.";
}

export function failedMessage(surface: Surface): string {
  return surface === "login" ? "Sign in failed. Try again." : "Passkey setup failed. Try again.";
}

export function messageFor(code: AuthErrorCode, surface: Surface): string {
  switch (code) {
    case "UNKNOWN_PASSKEY":
      return "This passkey is not registered for this studio.";
    case "INVALID_TOKEN":
      return "That token is not valid.";
    case "SETUP_LOCKED":
      return "Too many attempts. Try again in 15 minutes.";
    case "SETUP_CLOSED":
      return "Setup is closed.";
    case "ALREADY_REGISTERED":
      return "This device already has a studio passkey.";
    case "VERIFICATION_FAILED":
    case "CHALLENGE_EXPIRED":
      return failedMessage(surface);
  }
}

// What the browser threw while the passkey prompt was open: a cancel or timeout, an authenticator that
// already holds a studio passkey, or anything else.
export function browserErrorMessage(error: unknown, surface: Surface): string {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "AbortError") {
    return cancelledMessage(surface);
  }
  if (name === "InvalidStateError") {
    return messageFor("ALREADY_REGISTERED", surface);
  }
  return failedMessage(surface);
}
