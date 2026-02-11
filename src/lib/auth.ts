import { ApiException } from "@/lib/api/errors";

export const ADMIN_COOKIE_NAME = "smzdd_admin_session";

function parseCookieHeader(cookieHeader: string | null) {
  const map = new Map<string, string>();
  if (!cookieHeader) return map;

  const pairs = cookieHeader.split(";");
  for (const pair of pairs) {
    const [rawKey, ...rawValue] = pair.trim().split("=");
    if (!rawKey || rawValue.length === 0) continue;
    map.set(rawKey, decodeURIComponent(rawValue.join("=")));
  }

  return map;
}

export function getAdminExpectedPassword() {
  return process.env.ADMIN_PASSWORD ?? "admin123";
}

export function getAdminSessionToken() {
  return process.env.ADMIN_SESSION_TOKEN ?? "smzdd-admin-session";
}

export function hasValidAdminSessionFromCookieHeader(cookieHeader: string | null) {
  const cookies = parseCookieHeader(cookieHeader);
  return cookies.get(ADMIN_COOKIE_NAME) === getAdminSessionToken();
}

export function requireAdminSession(request: Request) {
  const ok = hasValidAdminSessionFromCookieHeader(request.headers.get("cookie"));
  if (!ok) {
    throw new ApiException(401, 401, "unauthorized");
  }
}
