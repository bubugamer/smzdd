export const dynamic = "force-dynamic";

import { z } from "zod";
import { withApiHandler } from "@/lib/api/handler";
import { ApiException } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { importFromCsv } from "@/lib/server/csv-import";

const schema = z.object({
  entity: z.enum(["providers", "models", "providerModels"]),
  csvText: z.string().min(1),
  dryRun: z.boolean().optional(),
});

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiException(400, 400, parsed.error.issues[0]?.message ?? "invalid payload");
    }

    const data = await importFromCsv(parsed.data);
    return apiSuccess(data, parsed.data.dryRun === false ? "imported" : "preview");
  });
}
