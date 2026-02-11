import { Queue, type JobsOptions } from "bullmq";
import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL;
const connection = redisUrl ? new IORedis(redisUrl, { maxRetriesPerRequest: null }) : null;

const probeQueueName = "probe-check";
const probeSweepQueueName = "probe-sweep";

const probeQueue = connection ? new Queue(probeQueueName, { connection }) : null;
const probeSweepQueue = connection ? new Queue(probeSweepQueueName, { connection }) : null;

export function isQueueEnabled() {
  return Boolean(connection && probeQueue && probeSweepQueue);
}

export function getQueueStatus() {
  return {
    enabled: isQueueEnabled(),
    redisUrl: redisUrl ?? null,
    queues: [probeQueueName, probeSweepQueueName],
  };
}

export async function enqueueProbeChecks(
  providerIds: string[],
  options?: { delayMs?: number; timeoutMs?: number },
) {
  if (!probeQueue) {
    return { queued: 0, enabled: false };
  }

  const jobs = providerIds.map((providerId) => ({
    name: "probe-provider",
    data: { providerId },
    opts: {
      removeOnComplete: true,
      removeOnFail: 1000,
      delay: options?.delayMs ?? 0,
      attempts: 1,
    } satisfies JobsOptions,
  }));
  await probeQueue.addBulk(jobs);
  return { queued: jobs.length, enabled: true };
}

export async function ensureProbeSweepSchedule(intervalMinutes: number) {
  if (!probeSweepQueue) {
    return { enabled: false };
  }

  await probeSweepQueue.upsertJobScheduler(
    "auto-probe-sweep",
    { every: intervalMinutes * 60 * 1000 },
    {
      name: "auto-probe-sweep",
      data: {},
      opts: {
        removeOnComplete: true,
        removeOnFail: 1000,
      },
    },
  );

  return { enabled: true };
}

export async function removeProbeSweepSchedule() {
  if (!probeSweepQueue) return { enabled: false };
  await probeSweepQueue.removeJobScheduler("auto-probe-sweep");
  return { enabled: true };
}

export async function listQueueJobs(params: {
  queueName: "probe-check" | "probe-sweep";
  state?: "waiting" | "active" | "completed" | "failed" | "delayed";
  limit?: number;
}) {
  const queue =
    params.queueName === "probe-check"
      ? probeQueue
      : params.queueName === "probe-sweep"
        ? probeSweepQueue
        : null;

  if (!queue) {
    return { enabled: false, items: [] as Array<Record<string, unknown>> };
  }

  const state = params.state ?? "waiting";
  const limit = params.limit && params.limit > 0 ? Math.min(params.limit, 200) : 50;
  const jobs = await queue.getJobs([state], 0, limit - 1, false);
  return {
    enabled: true,
    items: jobs.map((job) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      state,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      timestamp: job.timestamp,
      finishedOn: job.finishedOn,
    })),
  };
}

export async function retryQueueJob(id: string, queueName: "probe-check" | "probe-sweep") {
  const queue = queueName === "probe-check" ? probeQueue : probeSweepQueue;
  if (!queue) {
    return { enabled: false, retried: false };
  }

  const job = await queue.getJob(id);
  if (!job) {
    return { enabled: true, retried: false };
  }
  await job.retry();
  return { enabled: true, retried: true };
}
