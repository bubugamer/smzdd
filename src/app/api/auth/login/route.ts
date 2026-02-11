export const dynamic = "force-dynamic";

import { withApiHandler } from "@/lib/api/handler";
import { ApiException } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import {
  ADMIN_COOKIE_NAME,
  getAdminExpectedPassword,
  getAdminSessionToken,
} from "@/lib/auth";

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = await request.json();
    const password = body.password ? String(body.password) : "";

    if (!password) {
      throw new ApiException(400, 400, "password is required");
    }

    if (password !== getAdminExpectedPassword()) {
      throw new ApiException(401, 401, "invalid credentials");
    }

    const response = apiSuccess({ loggedIn: true }, "login success");
    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: getAdminSessionToken(),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return response;
  });
}
