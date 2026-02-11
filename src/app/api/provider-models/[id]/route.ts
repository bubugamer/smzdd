export const dynamic = "force-dynamic";

import { withApiHandler } from "@/lib/api/handler";
import { ApiException } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { getProviderModelById, updateProviderModelPrice } from "@/lib/server/data";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const item = await getProviderModelById(params.id);
    if (!item) {
      throw new ApiException(404, 404, "provider model not found");
    }
    return apiSuccess(item);
  });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const body = await request.json();
    const updated = await updateProviderModelPrice({
      id: params.id,
      inputPricePerMillion:
        body.inputPricePerMillion === undefined ? undefined : Number(body.inputPricePerMillion),
      outputPricePerMillion:
        body.outputPricePerMillion === undefined ? undefined : Number(body.outputPricePerMillion),
      isAvailable: body.isAvailable,
      notes: body.notes,
    });

    if (!updated) {
      throw new ApiException(404, 404, "provider model not found");
    }

    return apiSuccess(updated, "updated");
  });
}
