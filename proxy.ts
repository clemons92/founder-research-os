import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const authedPrefixes = ["/dashboard", "/account", "/billing"];

/**
 * Optimistic auth gate. Reads only the session cookie — no DB calls — because
 * this runs on every request (including prefetches). Authoritative checks live
 * in the Data Access Layer (`lib/dal`), close to the data.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthedRoute = authedPrefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const sessionCookie = getSessionCookie(request);

  if (isAuthedRoute && !sessionCookie) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  if (sessionCookie && (pathname === "/sign-in" || pathname === "/sign-up")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/account/:path*",
    "/billing/:path*",
    "/sign-in",
    "/sign-up",
  ],
};
