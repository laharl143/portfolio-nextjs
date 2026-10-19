// Cookie names and attributes for studio login (spec 0005). No "server-only" import on purpose: the proxy uses it.
// It holds no secret, only names and flags.

export const CHALLENGE_COOKIE = "studio_challenge";

// Set by the proxy on every studio request, read by the guard to build the login `next` path.
export const STUDIO_PATH_HEADER = "x-studio-pathname";

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

// Keyed on the origin, not NODE_ENV, so `next start` over http://localhost still works outside Chrome.
function isSecureOrigin(): boolean {
  return (process.env.STUDIO_ORIGIN ?? "").startsWith("https://");
}

export function sessionCookieName(): string {
  return isSecureOrigin() ? "__Host-studio_session" : "studio_session";
}

export function sessionCookieOptions(maxAge: number = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    secure: isSecureOrigin(),
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function challengeCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: isSecureOrigin(),
    sameSite: "strict" as const,
    path: "/studio",
    maxAge,
  };
}
