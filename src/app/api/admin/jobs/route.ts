export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ApiException } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { getQueueStatus, listQueueJobs } from "@/lib/server/queue";

export async function GET(request: NextRequest) {
  return withApiHandler(async () => {
    const searchParams = request.nextUrl.searchParams;
    const queueNameRaw = searchParams.get("queue") ?? "probe-check";
    if (!["probe-check", "probe-sweep"].includes(queueNameRaw)) {
      throw new ApiException(400, 400, "invalid queue");
    }

    const stateRaw = searchParams.get("state") ?? "waiting";
    if (!["waiting", "active", "completed", "failed", "delayed"].includes(stateRaw)) {
      throw new ApiException(400, 400, "invalid state");
    }

    const data = await listQueueJobs({
      queueName: queueNameRaw as "probe-check" | "probe-sweep",
      state: stateRaw as "waiting" | "active" | "completed" | "failed" | "delayed",
      limit: Number(searchParams.get("limit") ?? 50),
    });

    return apiSuccess({
      ...data,
      queue: queueNameRaw,
      state: stateRaw,
      status: getQueueStatus(),
    });
  });
}
