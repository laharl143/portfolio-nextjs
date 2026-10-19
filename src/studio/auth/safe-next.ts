import "server-only";
import "@/studio/marker";

const FALLBACK = "/studio";
const AUTH_PATHS = ["/studio/login", "/studio/setup"];

function hasUnsafePath(path: string): boolean {
  // Control and whitespace characters (URL parsers strip tabs and newlines) and backslashes.
  if (/[\u0000- \u007f\\]/.test(path)) {
    return true;
  }
  if (path.includes("//")) {
    return true;
  }
  return path.split("/").some((segment) => segment === ".." || segment === ".");
}

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((auth) => pathname === auth || pathname.startsWith(`${auth}/`));
}

// The only place a post sign in destination is accepted (spec 0005, Key invariants). Anything doubtful becomes /studio.
export function safeNext(value: string | null | undefined): string {
  if (!value) {
    return FALLBACK;
  }
  if (!(value === "/studio" || value.startsWith("/studio/") || value.startsWith("/studio?"))) {
    return FALLBACK;
  }
  const pathname = value.split(/[?#]/)[0];
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return FALLBACK;
  }
  // Browsers treat %2e%2e as "..", so check the decoded path as well.
  if (hasUnsafePath(value) || hasUnsafePath(decoded) || isAuthPath(pathname) || isAuthPath(decoded)) {
    return FALLBACK;
  }
  return value;
}
