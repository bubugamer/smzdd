import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  getAdminSessionToken,
} from "@/lib/auth";

const protectedWriteApiPrefixes = [
  "/api/admin",
  "/api/providers",
  "/api/models",
  "/api/provider-models",
  "/api/probes",
  "/api/reviews",
  "/api/settings",
  "/api/compare/providers",
];

function isAdminAuthenticated(request: NextRequest) {
  return request.cookies.get(ADMIN_COOKIE_NAME)?.value === getAdminSessionToken();
}

function isProtectedWriteApi(pathname: string, method: string) {
  if (["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) {
    return false;
  }

  // Public review submission is allowed for anonymous users.
  if (pathname === "/api/reviews" && method.toUpperCase() === "POST") {
    return false;
  }

  return protectedWriteApiPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authed = isAdminAuthenticated(request);

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      if (authed) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      return NextResponse.next();
    }

    if (!authed) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  if (pathname.startsWith("/api/admin") && !authed) {
    return NextResponse.json(
      { code: 401, message: "unauthorized", data: {} },
      { status: 401 },
    );
  }

  if (isProtectedWriteApi(pathname, request.method) && !authed) {
    return NextResponse.json(
      { code: 401, message: "unauthorized", data: {} },
      { status: 401 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
