export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { ProviderStatus } from "@prisma/client";
import { withApiHandler } from "@/lib/api/handler";
import { ApiException } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { createProvider, listProviders } from "@/lib/server/data";

export async function GET(request: NextRequest) {
  return withApiHandler(async () => {
    const searchParams = request.nextUrl.searchParams;
    const statusRaw = searchParams.get("status");
    const status = statusRaw ? (statusRaw.toUpperCase() as ProviderStatus) : undefined;

    if (status && !Object.values(ProviderStatus).includes(status)) {
      throw new ApiException(400, 400, "invalid status");
    }

    const data = await listProviders({
      search: searchParams.get("search") ?? undefined,
      status,
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 20),
    });

    return apiSuccess(data);
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = await request.json();
    if (!body.name || !body.slug || !body.website) {
      throw new ApiException(400, 400, "name, slug, website are required");
    }

    const status = body.status
      ? (String(body.status).toUpperCase() as ProviderStatus)
      : ProviderStatus.ACTIVE;

    if (!Object.values(ProviderStatus).includes(status)) {
      throw new ApiException(400, 400, "invalid status");
    }

    const data = await createProvider({
      name: String(body.name),
      slug: String(body.slug),
      website: String(body.website),
      description: body.description ? String(body.description) : undefined,
      country: body.country ? String(body.country) : undefined,
      status,
    });

    return apiSuccess(data, "created", 0, 201);
  });
}
