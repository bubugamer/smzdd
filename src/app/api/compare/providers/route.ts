export const dynamic = "force-dynamic";

import { withApiHandler } from "@/lib/api/handler";
import { ApiException } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { compareProviders } from "@/lib/server/data";

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const body = await request.json();
    const providerIds = Array.isArray(body.providerIds)
      ? body.providerIds.filter(
          (id: unknown): id is string =>
            typeof id === "string" && id.trim().length > 0,
        )
      : [];

    const uniqueProviderIds: string[] = Array.from(new Set<string>(providerIds));
    if (uniqueProviderIds.length < 2) {
      throw new ApiException(
        400,
        400,
        "providerIds requires at least two distinct ids",
      );
    }

    const data = await compareProviders(uniqueProviderIds);
    return apiSuccess(data);
  });
}
