const fs = require("fs");
const path = require("path");
const {
  PrismaClient,
  PricingType,
  ProviderStatus,
  PriceChangeType,
  ProbeType,
  ProbeMethod,
} = require("@prisma/client");

const prisma = new PrismaClient();

function readJson(fileName) {
  const fullPath = path.resolve(__dirname, "..", "data", fileName);
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function safeEnum(value, enumObject, fallback) {
  return Object.values(enumObject).includes(value) ? value : fallback;
}

async function upsertProviders(providers) {
  const providerMap = new Map();

  for (const item of providers) {
    const data = {
      name: item.name,
      slug: item.slug,
      website: item.website,
      country: item.country ?? null,
      description: item.description ?? null,
      status: safeEnum(item.status, ProviderStatus, ProviderStatus.ACTIVE),
    };

    const provider = await prisma.provider.upsert({
      where: { slug: item.slug },
      update: data,
      create: data,
    });

    providerMap.set(item.slug, provider);
  }

  return providerMap;
}

async function upsertModels(models) {
  const modelMap = new Map();

  for (const item of models) {
    const data = {
      name: item.name,
      displayName: item.displayName,
      family: item.family,
      provider: item.provider,
      contextWindow: item.contextWindow ?? null,
      maxOutput: item.maxOutput ?? null,
      modality: Array.isArray(item.modality) ? item.modality : ["text"],
      description: item.description ?? null,
      deprecated: Boolean(item.deprecated),
    };

    const model = await prisma.model.upsert({
      where: { name: item.name },
      update: data,
      create: data,
    });

    modelMap.set(item.name, model);
  }

  return modelMap;
}

async function upsertProviderModels(providers, providerMap, modelMap) {
  const createdLinks = [];

  for (const provider of providers) {
    const providerRecord = providerMap.get(provider.slug);
    if (!providerRecord || !Array.isArray(provider.models)) continue;

    for (const entry of provider.models) {
      const modelRecord = modelMap.get(entry.model);
      if (!modelRecord) continue;

      const pricingType = safeEnum(
        entry.pricingType,
        PricingType,
        PricingType.TOKEN_BASED,
      );

      const link = await prisma.providerModel.upsert({
        where: {
          providerId_modelId: {
            providerId: providerRecord.id,
            modelId: modelRecord.id,
          },
        },
        update: {
          providerModelName: entry.providerModelName || modelRecord.name,
          inputPricePerMillion:
            entry.inputPricePerMillion === undefined ? null : entry.inputPricePerMillion,
          outputPricePerMillion:
            entry.outputPricePerMillion === undefined ? null : entry.outputPricePerMillion,
          currency: entry.currency || "USD",
          pricingType,
          isAvailable: entry.isAvailable === undefined ? true : Boolean(entry.isAvailable),
          notes: entry.notes || null,
        },
        create: {
          providerId: providerRecord.id,
          modelId: modelRecord.id,
          providerModelName: entry.providerModelName || modelRecord.name,
          inputPricePerMillion:
            entry.inputPricePerMillion === undefined ? null : entry.inputPricePerMillion,
          outputPricePerMillion:
            entry.outputPricePerMillion === undefined ? null : entry.outputPricePerMillion,
          currency: entry.currency || "USD",
          pricingType,
          isAvailable: entry.isAvailable === undefined ? true : Boolean(entry.isAvailable),
          notes: entry.notes || null,
        },
      });

      createdLinks.push(link);

      const hasInitialPrice = await prisma.priceHistory.findFirst({
        where: {
          providerModelId: link.id,
          changeType: PriceChangeType.INITIAL,
          notes: "seed initial price",
        },
        select: { id: true },
      });

      if (!hasInitialPrice) {
        await prisma.priceHistory.create({
          data: {
            providerId: link.providerId,
            providerModelId: link.id,
            inputPricePerMillion: link.inputPricePerMillion,
            outputPricePerMillion: link.outputPricePerMillion,
            currency: link.currency,
            changeType: PriceChangeType.INITIAL,
            notes: "seed initial price",
          },
        });
      }

      const hasProbe = await prisma.availabilityProbe.findFirst({
        where: { providerModelId: link.id },
        select: { id: true },
      });

      if (!hasProbe) {
        await prisma.availabilityProbe.create({
          data: {
            providerId: link.providerId,
            providerModelId: link.id,
            probeType: ProbeType.API_CALL,
            isSuccessful: true,
            responseTime: 850,
            statusCode: 200,
            probeMethod: ProbeMethod.MANUAL,
          },
        });
      }
    }
  }

  return createdLinks;
}

async function seedDefaultReviews(providerMap) {
  const defaults = [
    {
      slug: "packy-code",
      rating: 5,
      title: "稳定可靠",
      content: "企业场景可用性优秀",
      pros: ["稳定", "高可用"],
      cons: ["价格偏高"],
      reviewerName: "ops-team",
    },
    {
      slug: "micu",
      rating: 4,
      title: "性价比高",
      content: "预算有限时表现很好",
      pros: ["便宜", "速度尚可"],
      cons: ["偶发波动"],
      reviewerName: "dev-team",
    },
  ];

  for (const item of defaults) {
    const provider = providerMap.get(item.slug);
    if (!provider) continue;

    const exists = await prisma.review.findFirst({
      where: {
        providerId: provider.id,
        title: item.title,
        reviewerName: item.reviewerName,
      },
      select: { id: true },
    });

    if (!exists) {
      await prisma.review.create({
        data: {
          providerId: provider.id,
          rating: item.rating,
          title: item.title,
          content: item.content,
          pros: item.pros,
          cons: item.cons,
          reviewerName: item.reviewerName,
        },
      });
    }
  }
}

async function main() {
  const providers = readJson("providers.json");
  const models = readJson("model-catalog.json");

  const providerMap = await upsertProviders(providers);
  const modelMap = await upsertModels(models);
  const links = await upsertProviderModels(providers, providerMap, modelMap);
  await seedDefaultReviews(providerMap);

  console.log(
    `Seed completed: providers=${providerMap.size}, models=${modelMap.size}, providerModels=${links.length}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
