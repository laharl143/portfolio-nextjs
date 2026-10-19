import { NextResponse } from "next/server";

// First filter for the studio (spec 0003). requireStudioAccess() is the real gate;
// this only keeps a disabled studio from rendering anything at all.
export function proxy() {
  if (process.env.STUDIO_ENABLED !== "true") {
    return new NextResponse(null, { status: 404 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/studio", "/studio/:path*"],
};
