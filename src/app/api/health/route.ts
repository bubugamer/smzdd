export const dynamic = "force-dynamic";

import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";

export async function GET() {
  return withApiHandler(async () => {
    return apiSuccess({ service: "smzdd", status: "ok", timestamp: new Date().toISOString() });
  });
}
