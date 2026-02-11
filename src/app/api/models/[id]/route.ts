export const dynamic = "force-dynamic";

import { withApiHandler } from "@/lib/api/handler";
import { ApiException } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { getModelByIdOrName, updateModel } from "@/lib/server/data";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const model = await getModelByIdOrName(params.id);
    if (!model) {
      throw new ApiException(404, 404, "model not found");
    }

    return apiSuccess(model);
  });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const body = await request.json();
    const data = await updateModel(params.id, {
      displayName: body.displayName ? String(body.displayName) : undefined,
      family: body.family ? String(body.family) : undefined,
      provider: body.provider ? String(body.provider) : undefined,
      contextWindow:
        body.contextWindow === undefined
          ? undefined
          : body.contextWindow === null
            ? null
            : Number(body.contextWindow),
      maxOutput:
        body.maxOutput === undefined
          ? undefined
          : body.maxOutput === null
            ? null
            : Number(body.maxOutput),
      modality: Array.isArray(body.modality)
        ? body.modality.map((item: unknown) => String(item))
        : undefined,
      description:
        body.description === null ? null : body.description ? String(body.description) : undefined,
      deprecated: body.deprecated === undefined ? undefined : Boolean(body.deprecated),
    });

    if (!data) {
      throw new ApiException(404, 404, "model not found");
    }

    return apiSuccess(data, "updated");
  });
}
