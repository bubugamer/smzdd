/* eslint-disable no-console */
const { Worker, Queue } = require("bullmq");
const IORedis = require("ioredis");
const { PrismaClient, ProviderStatus } = require("@prisma/client");

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  console.error("REDIS_URL is required for probe worker");
  process.exit(1);
}

const prisma = new PrismaClient();
const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
const probeQueue = new Queue("probe-check", { connection });

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const probeWorker = new Worker(
  "probe-check",
  async (job) => {
    const providerId = job.data.providerId;
    if (!providerId) return;
    const isSuccessful = Math.random() >= 0.1;
    await prisma.availabilityProbe.create({
      data: {
        providerId,
        probeType: "HEALTH_CHECK",
        probeMethod: "SCHEDULED",
        isSuccessful,
        responseTime: rand(120, 800),
        statusCode: isSuccessful ? 200 : 500,
        errorMessage: isSuccessful ? null : "probe failed",
      },
    });
  },
  { connection },
);

const sweepWorker = new Worker(
  "probe-sweep",
  async () => {
    const providers = await prisma.provider.findMany({
      where: { status: ProviderStatus.ACTIVE },
      select: { id: true },
      take: 200,
    });
    if (providers.length === 0) return;
    await probeQueue.addBulk(
      providers.map((item) => ({
        name: "probe-provider",
        data: { providerId: item.id },
        opts: { removeOnComplete: true, removeOnFail: 1000, timeout: 8000 },
      })),
    );
  },
  { connection },
);

for (const worker of [probeWorker, sweepWorker]) {
  worker.on("completed", (job) => {
    console.log(`[${worker.name}] completed ${job.id}`);
  });
  worker.on("failed", (job, error) => {
    console.error(`[${worker.name}] failed ${job?.id}`, error.message);
  });
}

process.on("SIGTERM", async () => {
  await Promise.all([probeWorker.close(), sweepWorker.close(), prisma.$disconnect(), connection.quit()]);
  process.exit(0);
});

console.log("Probe worker started");
