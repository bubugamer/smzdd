export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ApiException } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { listProviderModelPriceHistory } from "@/lib/server/data";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? 50);
    const data = await listProviderModelPriceHistory(params.id, limit);
    if (!data) {
      throw new ApiException(404, 404, "provider model not found");
    }

    return apiSuccess(data);
  });
}
