export const dynamic = "force-dynamic";

import { ProviderStatus, ProbeMethod, ProbeType } from "@prisma/client";
import { z } from "zod";
import { withApiHandler } from "@/lib/api/handler";
import { ApiException } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import prisma from "@/lib/db";
import { createProbe } from "@/lib/server/data";
import {
  enqueueProbeChecks,
  ensureProbeSweepSchedule,
  getQueueStatus,
  removeProbeSweepSchedule,
} from "@/lib/server/queue";
import { readAdminSettings, writeAdminSettings } from "@/lib/server/settings";

const schema = z.object({
  providerIds: z.array(z.string()).optional(),
  mode: z.enum(["once", "schedule"]).default("once"),
  enabled: z.boolean().optional(),
  intervalMinutes: z.number().int().min(5).max(1440).optional(),
});

async function fallbackCreateProbes(providerIds: string[]) {
  let created = 0;
  for (const providerId of providerIds) {
    const isSuccessful = Math.random() >= 0.1;
    await createProbe({
      providerId,
      probeType: ProbeType.HEALTH_CHECK,
      probeMethod: ProbeMethod.SCHEDULED,
      isSuccessful,
      responseTime: 100 + Math.round(Math.random() * 600),
      statusCode: isSuccessful ? 200 : 500,
      errorMessage: isSuccessful ? undefined : "fallback probe failed",
    });
    created += 1;
  }
  return created;
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiException(400, 400, parsed.error.issues[0]?.message ?? "invalid payload");
    }

    const settings = await readAdminSettings();
    const providerRows = await prisma.provider.findMany({
      where: parsed.data.providerIds?.length
        ? { id: { in: parsed.data.providerIds } }
        : { status: ProviderStatus.ACTIVE },
      select: { id: true },
      take: settings.probeScheduler.maxJobsPerSweep,
    });
    const providerIds = providerRows.map((item) => item.id);

    if (providerIds.length === 0) {
      throw new ApiException(400, 400, "no providers available");
    }

    if (parsed.data.mode === "schedule") {
      const enabled = parsed.data.enabled ?? settings.probeScheduler.enabled;
      const intervalMinutes =
        parsed.data.intervalMinutes ?? settings.probeScheduler.intervalMinutes;
      settings.probeScheduler.enabled = enabled;
      settings.probeScheduler.intervalMinutes = intervalMinutes;
      await writeAdminSettings(settings);

      if (enabled) {
        await ensureProbeSweepSchedule(intervalMinutes);
      } else {
        await removeProbeSweepSchedule();
      }

      return apiSuccess({
        mode: "schedule",
        enabled,
        intervalMinutes,
        providerCount: providerIds.length,
        queue: getQueueStatus(),
      }, "updated");
    }

    const queued = await enqueueProbeChecks(providerIds, {
      timeoutMs: settings.probeScheduler.timeoutMs,
    });
    if (!queued.enabled) {
      const created = await fallbackCreateProbes(providerIds);
      return apiSuccess({
        mode: "once",
        queueEnabled: false,
        fallbackCreated: created,
        providerCount: providerIds.length,
      }, "created");
    }

    return apiSuccess({
      mode: "once",
      queueEnabled: true,
      queued: queued.queued,
      providerCount: providerIds.length,
    }, "queued");
  });
}
