export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { ProviderStatus } from "@prisma/client";
import { withApiHandler } from "@/lib/api/handler";
import { ApiException } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { createProvider, listProviders } from "@/lib/server/data";
import { readAdminSettings } from "@/lib/server/settings";

export async function GET(request: NextRequest) {
  return withApiHandler(async () => {
    const searchParams = request.nextUrl.searchParams;
    const statusRaw = searchParams.get("status");
    const status = statusRaw ? (statusRaw.toUpperCase() as ProviderStatus) : undefined;
    const sortByRaw = searchParams.get("sortBy");
    const sortOrderRaw = searchParams.get("sortOrder");
    const sampleModelRaw = searchParams.get("sampleModel");
    const selectedRaw = searchParams.get("selected");
    const selectedSlugs = selectedRaw
      ? selectedRaw.split(",").map((item) => item.trim()).filter(Boolean)
      : undefined;
    const pageRaw = Number(searchParams.get("page") ?? 1);
    const pageSizeRaw = Number(searchParams.get("pageSize") ?? 20);

    const sortBySet = new Set(["compositeScore", "uptime3d", "inputPrice", "outputPrice", "updatedAt", "name", "sampleModel", "status"]);
    const sortOrderSet = new Set(["asc", "desc"]);
    const sortBy = sortByRaw ?? "compositeScore";
    const sortOrder = (sortOrderRaw ?? "desc").toLowerCase();
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
    const pageSize = Number.isFinite(pageSizeRaw) && pageSizeRaw > 0 ? Math.floor(pageSizeRaw) : 20;

    if (status && !Object.values(ProviderStatus).includes(status)) {
      throw new ApiException(400, 400, "invalid status");
    }
    if (!sortBySet.has(sortBy)) {
      throw new ApiException(400, 400, "invalid sortBy");
    }
    if (!sortOrderSet.has(sortOrder)) {
      throw new ApiException(400, 400, "invalid sortOrder");
    }

    const adminSettings = await readAdminSettings();
    const data = await listProviders({
      search: searchParams.get("search") ?? undefined,
      status,
      selectedSlugs,
      sortBy: sortBy as "compositeScore" | "uptime3d" | "inputPrice" | "outputPrice" | "updatedAt" | "name" | "sampleModel" | "status",
      sortOrder: sortOrder as "asc" | "desc",
      sampleModel: sampleModelRaw?.trim() || adminSettings.sampleModel || "gpt-5.2",
      page,
      pageSize,
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
