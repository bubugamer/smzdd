export const dynamic = "force-dynamic";

import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { hasValidAdminSessionFromCookieHeader } from "@/lib/auth";

export async function GET(request: Request) {
  return withApiHandler(async () => {
    const loggedIn = hasValidAdminSessionFromCookieHeader(request.headers.get("cookie"));
    return apiSuccess({ loggedIn });
  });
}
