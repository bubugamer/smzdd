export const dynamic = "force-dynamic";

import { z } from "zod";
import { withApiHandler } from "@/lib/api/handler";
import { ApiException } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { retryQueueJob } from "@/lib/server/queue";

const schema = z.object({
  queue: z.enum(["probe-check", "probe-sweep"]),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return withApiHandler(async () => {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiException(400, 400, parsed.error.issues[0]?.message ?? "invalid payload");
    }

    const data = await retryQueueJob(params.id, parsed.data.queue);
    if (data.enabled && !data.retried) {
      throw new ApiException(404, 404, "job not found");
    }
    return apiSuccess(data, "retried");
  });
}
