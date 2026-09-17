import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "medical_session";
const TEMPORARY_SESSION_COOKIE = "medical_temporary_session";

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/medicines/:path*",
    "/categories/:path*",
    "/manufacturers/:path*",
    "/inventory/:path*",
    "/batches/:path*",
    "/purchases/:path*",
    "/sales/:path*",
    "/customers/:path*",
    "/suppliers/:path*",
    "/payments/:path*",
    "/reports/:path*",
    "/notifications/:path*",
    "/users/:path*",
    "/settings/:path*",
    "/change-password/:path*",
    "/audit-logs/:path*",
    "/login",
    "/forgot-password",
    "/reset-password",
    "/demo",
  ],
};

export function proxy(request: NextRequest) {
  const hasSession = Boolean(
    request.cookies.get(SESSION_COOKIE)?.value || request.cookies.get(TEMPORARY_SESSION_COOKIE)?.value,
  );
  const protectedPaths = [
    "/dashboard",
    "/medicines",
    "/categories",
    "/manufacturers",
    "/inventory",
    "/batches",
    "/purchases",
    "/sales",
    "/customers",
    "/suppliers",
    "/payments",
    "/reports",
    "/notifications",
    "/users",
    "/settings",
    "/change-password",
    "/audit-logs",
  ];
  const isProtectedPath =
    request.nextUrl.pathname === "/" ||
    protectedPaths.some(
      (path) =>
        request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`),
    );
  if (isProtectedPath && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}