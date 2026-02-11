export const dynamic = "force-dynamic";

import { ProviderStatus } from "@prisma/client";
import { withApiHandler } from "@/lib/api/handler";
import { ApiException } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { deleteProvider, getProviderByIdOrSlug, updateProvider } from "@/lib/server/data";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const provider = await getProviderByIdOrSlug(params.id);
    if (!provider) {
      throw new ApiException(404, 404, "provider not found");
    }

    return apiSuccess(provider);
  });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const body = await request.json();
    const status = body.status
      ? (String(body.status).toUpperCase() as ProviderStatus)
      : undefined;

    if (status && !Object.values(ProviderStatus).includes(status)) {
      throw new ApiException(400, 400, "invalid status");
    }

    const data = await updateProvider(params.id, {
      name: body.name ? String(body.name) : undefined,
      slug: body.slug ? String(body.slug) : undefined,
      website: body.website ? String(body.website) : undefined,
      description:
        body.description === null ? null : body.description ? String(body.description) : undefined,
      country: body.country === null ? null : body.country ? String(body.country) : undefined,
      status,
    });

    if (!data) {
      throw new ApiException(404, 404, "provider not found");
    }

    return apiSuccess(data, "updated");
  });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const data = await deleteProvider(params.id);
    if (!data) {
      throw new ApiException(404, 404, "provider not found");
    }

    return apiSuccess(data, "deleted");
  });
}
