export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { getUptimeSummary } from "@/lib/server/data";

export async function GET(request: NextRequest) {
  return withApiHandler(async () => {
    const days = Number(request.nextUrl.searchParams.get("days") ?? 3);
    const safeDays = Math.min(Math.max(days, 1), 30);
    const data = await getUptimeSummary(safeDays);
    return apiSuccess(data);
  });
}
