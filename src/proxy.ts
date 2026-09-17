import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "medical_session";

export function proxy(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const protectedPaths = ["/dashboard", "/medicines", "/categories", "/manufacturers", "/inventory", "/batches", "/purchases", "/sales", "/customers", "/suppliers", "/payments", "/reports", "/notifications", "/users", "/settings", "/change-password", "/audit-logs"];
  const isProtectedPath = request.nextUrl.pathname === "/" || protectedPaths.some((path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`));
  const isAuthPath = request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/forgot-password";

  if (isProtectedPath && !hasSession) return NextResponse.redirect(new URL("/login", request.url));
  if (isAuthPath && hasSession) return NextResponse.redirect(new URL("/dashboard", request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/", "/dashboard/:path*", "/medicines/:path*", "/categories/:path*", "/manufacturers/:path*", "/inventory/:path*", "/batches/:path*", "/purchases/:path*", "/sales/:path*", "/customers/:path*", "/suppliers/:path*", "/payments/:path*", "/reports/:path*", "/notifications/:path*", "/users/:path*", "/settings/:path*", "/change-password/:path*", "/audit-logs/:path*", "/login", "/forgot-password"] };