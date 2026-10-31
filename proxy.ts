import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_TOKEN_SUBJECT,
  SESSION_COOKIE,
  verifySessionToken,
} from "@/lib/session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const admin = verifySessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value) === ADMIN_TOKEN_SUBJECT;

  // Admin area: its own login and session, separate from readers'.
  if (pathname === "/admin/login") {
    return admin ? NextResponse.redirect(new URL("/admin", request.url)) : NextResponse.next();
  }
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (admin) return NextResponse.next();
    return pathname.startsWith("/api/")
      ? NextResponse.json({ error: "Not signed in as admin." }, { status: 401 })
      : NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // Reader: a reader session, or an admin session (so the admin can check their uploads).
  const user = admin || verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login") {
    // Already signed in: skip the login page.
    return user ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on every page except Next.js internals and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
