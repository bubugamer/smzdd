import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const scoringWeightsSchema = z.object({
  priceWeight: z.number().min(0).max(1),
  uptimeWeight: z.number().min(0).max(1),
  reviewWeight: z.number().min(0).max(1),
});

const scoringConfigSchema = z.object({
  version: z.string(),
  formula: z.string(),
  weights: scoringWeightsSchema,
  notes: z.string().optional(),
});

const schedulerSchema = z.object({
  enabled: z.boolean(),
  intervalMinutes: z.number().int().min(5).max(1440),
  timeoutMs: z.number().int().min(1000).max(120000),
  maxJobsPerSweep: z.number().int().min(1).max(2000),
});

const adminSettingsSchema = z.object({
  probeScheduler: schedulerSchema,
  sampleModel: z.string().min(1).default("gpt-5.2"),
});

const scoringConfigPath = path.join(process.cwd(), "data/scoring-config.json");
const adminSettingsPath = path.join(process.cwd(), "data/admin-settings.json");

const defaultAdminSettings = {
  probeScheduler: {
    enabled: false,
    intervalMinutes: 30,
    timeoutMs: 8000,
    maxJobsPerSweep: 200,
  },
  sampleModel: "gpt-5.2",
};

function assertWeightSum(weights: z.infer<typeof scoringWeightsSchema>) {
  const sum = weights.priceWeight + weights.uptimeWeight + weights.reviewWeight;
  if (Math.abs(sum - 1) > 0.001) {
    throw new Error("weights sum must equal 1");
  }
}

export type ScoringConfig = z.infer<typeof scoringConfigSchema>;
export type AdminSettings = z.infer<typeof adminSettingsSchema>;
export type ProbeSchedulerSettings = z.infer<typeof schedulerSchema>;

export async function readScoringConfig() {
  const raw = await readFile(scoringConfigPath, "utf-8");
  const parsed = scoringConfigSchema.parse(JSON.parse(raw));
  assertWeightSum(parsed.weights);
  return parsed;
}

export async function writeScoringConfig(input: ScoringConfig) {
  const parsed = scoringConfigSchema.parse(input);
  assertWeightSum(parsed.weights);
  await writeFile(scoringConfigPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf-8");
  return parsed;
}

export async function readAdminSettings() {
  try {
    const raw = await readFile(adminSettingsPath, "utf-8");
    return adminSettingsSchema.parse(JSON.parse(raw));
  } catch {
    await writeFile(adminSettingsPath, `${JSON.stringify(defaultAdminSettings, null, 2)}\n`, "utf-8");
    return defaultAdminSettings;
  }
}

export async function writeAdminSettings(input: AdminSettings) {
  const parsed = adminSettingsSchema.parse(input);
  await writeFile(adminSettingsPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf-8");
  return parsed;
}
