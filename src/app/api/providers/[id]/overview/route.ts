export const dynamic = "force-dynamic";

import { withApiHandler } from "@/lib/api/handler";
import { ApiException } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { getProviderOverview } from "@/lib/server/data";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const overview = await getProviderOverview(params.id);
    if (!overview) {
      throw new ApiException(404, 404, "provider overview not found");
    }

    return apiSuccess(overview);
  });
}
