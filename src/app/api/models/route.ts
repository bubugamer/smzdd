export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ApiException } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { createModel, listModels } from "@/lib/server/data";

export async function GET(request: NextRequest) {
  return withApiHandler(async () => {
    const searchParams = request.nextUrl.searchParams;
    const data = await listModels({
      search: searchParams.get("search") ?? undefined,
      family: searchParams.get("family") ?? undefined,
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 20),
    });

    return apiSuccess(data);
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = await request.json();
    if (!body.name || !body.displayName || !body.family || !body.provider) {
      throw new ApiException(
        400,
        400,
        "name, displayName, family, provider are required",
      );
    }

    const data = await createModel({
      name: String(body.name),
      displayName: String(body.displayName),
      family: String(body.family),
      provider: String(body.provider),
      contextWindow:
        body.contextWindow === undefined ? undefined : Number(body.contextWindow),
      maxOutput: body.maxOutput === undefined ? undefined : Number(body.maxOutput),
      modality: Array.isArray(body.modality)
        ? body.modality.map((item: unknown) => String(item))
        : undefined,
      description: body.description ? String(body.description) : undefined,
    });

    return apiSuccess(data, "created", 0, 201);
  });
}
