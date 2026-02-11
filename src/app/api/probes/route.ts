export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { ProbeMethod, ProbeType } from "@prisma/client";
import { withApiHandler } from "@/lib/api/handler";
import { ApiException } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { createProbe, listProbes } from "@/lib/server/data";

export async function GET(request: NextRequest) {
  return withApiHandler(async () => {
    const searchParams = request.nextUrl.searchParams;
    const data = await listProbes({
      providerId: searchParams.get("providerId") ?? undefined,
      providerModelId: searchParams.get("providerModelId") ?? undefined,
      days: Number(searchParams.get("days") ?? 7),
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 20),
    });

    return apiSuccess(data);
  });
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = await request.json();
    if (!body.providerId) {
      throw new ApiException(400, 400, "providerId is required");
    }

    const probeType = String(body.probeType ?? "API_CALL").toUpperCase() as ProbeType;
    const probeMethod = String(body.probeMethod ?? "MANUAL").toUpperCase() as ProbeMethod;

    if (!Object.values(ProbeType).includes(probeType)) {
      throw new ApiException(400, 400, "invalid probeType");
    }
    if (!Object.values(ProbeMethod).includes(probeMethod)) {
      throw new ApiException(400, 400, "invalid probeMethod");
    }

    const data = await createProbe({
      providerId: body.providerId,
      providerModelId: body.providerModelId,
      probeType,
      probeMethod,
      isSuccessful: Boolean(body.isSuccessful),
      responseTime: body.responseTime === undefined ? undefined : Number(body.responseTime),
      statusCode: body.statusCode === undefined ? undefined : Number(body.statusCode),
      errorMessage: body.errorMessage,
    });

    return apiSuccess(data, "created", 0, 201);
  });
}
