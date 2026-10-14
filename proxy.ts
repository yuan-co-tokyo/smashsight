import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isProtectedRoute } from "./lib/auth-routes";

export function proxy(request: NextRequest) {
  // This is only an optimistic check. Server Components verify the DB session.
  if (isProtectedRoute(request.nextUrl.pathname) && !getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  // Do not redirect auth pages based on a possibly expired/forged cookie.
  return NextResponse.next();
}

export const config = { matcher: ["/videos/:path*", "/compare/:path*"] };
