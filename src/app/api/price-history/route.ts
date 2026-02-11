export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { listPriceHistory } from "@/lib/server/data";

export async function GET(request: NextRequest) {
  return withApiHandler(async () => {
    const searchParams = request.nextUrl.searchParams;
    const data = await listPriceHistory({
      providerId: searchParams.get("providerId") ?? undefined,
      modelId: searchParams.get("modelId") ?? undefined,
      days: Number(searchParams.get("days") ?? 30),
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 20),
    });

    return apiSuccess(data);
  });
}
