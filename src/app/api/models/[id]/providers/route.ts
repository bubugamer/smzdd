export const dynamic = "force-dynamic";

import { withApiHandler } from "@/lib/api/handler";
import { ApiException } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { getModelProviders } from "@/lib/server/data";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const data = await getModelProviders(params.id);
    if (!data) {
      throw new ApiException(404, 404, "model not found");
    }

    return apiSuccess(data);
  });
}
