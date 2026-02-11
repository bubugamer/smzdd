export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { getProviderRankings } from "@/lib/server/data";

export async function GET(request: NextRequest) {
  return withApiHandler(async () => {
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? 20);
    const data = await getProviderRankings(limit);
    return apiSuccess(data);
  });
}
