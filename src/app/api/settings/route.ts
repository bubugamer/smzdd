export const dynamic = "force-dynamic";

import { z } from "zod";
import { withApiHandler } from "@/lib/api/handler";
import { ApiException } from "@/lib/api/errors";
import { apiSuccess } from "@/lib/api/response";
import { primeScoringWeights } from "@/lib/server/scoring";
import {
  readAdminSettings,
  readScoringConfig,
  writeAdminSettings,
  writeScoringConfig,
} from "@/lib/server/settings";
import {
  ensureProbeSweepSchedule,
  getQueueStatus,
  removeProbeSweepSchedule,
} from "@/lib/server/queue";

const updateSettingsSchema = z.object({
  scoringConfig: z
    .object({
      version: z.string(),
      formula: z.string(),
      notes: z.string().optional(),
      weights: z.object({
        priceWeight: z.number().min(0).max(1),
        uptimeWeight: z.number().min(0).max(1),
        reviewWeight: z.number().min(0).max(1),
      }),
    })
    .optional(),
  adminSettings: z
    .object({
      probeScheduler: z.object({
        enabled: z.boolean(),
        intervalMinutes: z.number().int().min(5).max(1440),
        timeoutMs: z.number().int().min(1000).max(120000),
        maxJobsPerSweep: z.number().int().min(1).max(2000),
      }),
    })
    .optional(),
});

export async function GET() {
  return withApiHandler(async () => {
    const [scoringConfig, adminSettings] = await Promise.all([
      readScoringConfig(),
      readAdminSettings(),
    ]);

    return apiSuccess({
      scoringConfig,
      adminSettings,
      queue: getQueueStatus(),
    });
  });
}

export async function PATCH(request: Request) {
  return withApiHandler(async () => {
    const parsed = updateSettingsSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ApiException(400, 400, parsed.error.issues[0]?.message ?? "invalid payload");
    }

    const currentScoring = await readScoringConfig();
    const currentAdmin = await readAdminSettings();
    const nextScoring = parsed.data.scoringConfig ?? currentScoring;
    const nextAdmin = parsed.data.adminSettings ?? currentAdmin;

    const weightSum =
      nextScoring.weights.priceWeight +
      nextScoring.weights.uptimeWeight +
      nextScoring.weights.reviewWeight;
    if (Math.abs(weightSum - 1) > 0.001) {
      throw new ApiException(400, 400, "weights sum must equal 1");
    }

    const [scoringConfig, adminSettings] = await Promise.all([
      writeScoringConfig(nextScoring),
      writeAdminSettings(nextAdmin),
    ]);

    primeScoringWeights(scoringConfig.weights);
    if (adminSettings.probeScheduler.enabled) {
      await ensureProbeSweepSchedule(adminSettings.probeScheduler.intervalMinutes);
    } else {
      await removeProbeSweepSchedule();
    }

    return apiSuccess({
      scoringConfig,
      adminSettings,
      queue: getQueueStatus(),
    }, "updated");
  });
}
