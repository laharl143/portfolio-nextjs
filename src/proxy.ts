import { NextResponse, type NextRequest } from "next/server";
import { STUDIO_PATH_HEADER, sessionCookieName, sessionCookieOptions } from "@/studio/auth/cookie";

const AUTH_PAGES = ["/studio/login", "/studio/setup"];

function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`));
}

// First filter for the studio (specs 0003, 0005). requireStudioAccess() is the real gate; this never touches
// the database. It 404s a disabled studio, sends a visitor with no session cookie to the login page, tells
// the guard which path was asked for, and keeps the cookie alive while the session slides.
export function proxy(request: NextRequest) {
  if (process.env.STUDIO_ENABLED !== "true") {
    return new NextResponse(null, { status: 404 });
  }

  const { pathname, search } = request.nextUrl;
  const cookieName = sessionCookieName();
  const token = request.cookies.get(cookieName)?.value;

  if (!token && !isAuthPage(pathname)) {
    const login = new URL("/studio/login", request.url);
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  // Always overwrite: the guard must never trust a client supplied value.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(STUDIO_PATH_HEADER, `${pathname}${search}`);
  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // GET only: server actions are POSTs and set or clear this cookie themselves; a refresh here would race them.
  if (token && request.method === "GET") {
    response.cookies.set(cookieName, token, sessionCookieOptions());
  }
  return response;
}

export const config = {
  matcher: ["/studio", "/studio/:path*"],
};
