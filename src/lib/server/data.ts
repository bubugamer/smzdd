import prisma from "@/lib/db";
import { calcCompositeScore } from "@/lib/server/scoring";
import {
  PriceChangeType,
  ProbeMethod,
  ProbeType,
  ProviderStatus,
  type Prisma,
} from "@prisma/client";

function decimalToNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (typeof value === "object" && value && "toNumber" in value && typeof (value as { toNumber: () => number }).toNumber === "function") {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

export async function getProviderUptime(providerId: string, days = 3) {
  const startAt = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [total, success] = await Promise.all([
    prisma.availabilityProbe.count({ where: { providerId, probedAt: { gte: startAt } } }),
    prisma.availabilityProbe.count({ where: { providerId, isSuccessful: true, probedAt: { gte: startAt } } }),
  ]);

  if (total === 0) return 1;
  return success / total;
}

export async function listProviders(params: {
  search?: string;
  status?: ProviderStatus;
  page?: number;
  pageSize?: number;
}) {
  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = params.pageSize && params.pageSize > 0 ? Math.min(params.pageSize, 100) : 20;

  const where = {
    ...(params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: "insensitive" as const } },
            { slug: { contains: params.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(params.status ? { status: params.status } : {}),
  };

  const [total, providers] = await Promise.all([
    prisma.provider.count({ where }),
    prisma.provider.findMany({
      where,
      orderBy: { addedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { models: true, reviews: true } },
        models: {
          take: 1,
          orderBy: { updatedAt: "desc" },
          select: { inputPricePerMillion: true, outputPricePerMillion: true, currency: true },
        },
        reviews: {
          select: { rating: true },
        },
      },
    }),
  ]);

  const rows = await Promise.all(
    providers.map(async (provider) => {
      const avgRating =
        provider.reviews.length > 0
          ? provider.reviews.reduce((sum, review) => sum + review.rating, 0) / provider.reviews.length
          : null;
      const uptimeRate = await getProviderUptime(provider.id, 3);

      const latestInputPrice = provider.models[0]
        ? decimalToNumber(provider.models[0].inputPricePerMillion)
        : null;

      return {
        id: provider.id,
        name: provider.name,
        slug: provider.slug,
        website: provider.website,
        status: provider.status,
        modelCount: provider._count.models,
        reviewCount: provider._count.reviews,
        avgRating: avgRating ? Number(avgRating.toFixed(2)) : null,
        uptime3d: Number((uptimeRate * 100).toFixed(2)),
        compositeScore: await calcCompositeScore({
          uptimeRate,
          avgRating,
          inputPricePerMillion: latestInputPrice,
        }),
        samplePricing: provider.models[0]
          ? {
              inputPricePerMillion: decimalToNumber(provider.models[0].inputPricePerMillion),
              outputPricePerMillion: decimalToNumber(provider.models[0].outputPricePerMillion),
              currency: provider.models[0].currency,
            }
          : null,
      };
    }),
  );

  return {
    items: rows,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getProviderByIdOrSlug(idOrSlug: string) {
  return prisma.provider.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
    include: {
      _count: { select: { models: true, reviews: true, probes: true } },
      models: {
        orderBy: { updatedAt: "desc" },
        include: {
          model: {
            select: { id: true, name: true, displayName: true, family: true },
          },
        },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      probes: {
        orderBy: { probedAt: "desc" },
        take: 20,
      },
    },
  });
}

export async function getProviderOverview(idOrSlug: string) {
  const provider = await getProviderByIdOrSlug(idOrSlug);
  if (!provider) return null;

  const avgRating =
    provider.reviews.length > 0
      ? provider.reviews.reduce((sum, review) => sum + review.rating, 0) / provider.reviews.length
      : null;
  const uptimeRate = await getProviderUptime(provider.id, 3);

  const latestPrice = provider.models[0]
    ? {
        providerModelId: provider.models[0].id,
        model: provider.models[0].model.displayName,
        inputPricePerMillion: decimalToNumber(provider.models[0].inputPricePerMillion),
        outputPricePerMillion: decimalToNumber(provider.models[0].outputPricePerMillion),
        currency: provider.models[0].currency,
      }
    : null;

  return {
    id: provider.id,
    name: provider.name,
    slug: provider.slug,
    website: provider.website,
    status: provider.status,
    description: provider.description,
    modelCount: provider._count.models,
    probeCount: provider._count.probes,
    reviewCount: provider._count.reviews,
    avgRating: avgRating ? Number(avgRating.toFixed(2)) : null,
    uptime3d: Number((uptimeRate * 100).toFixed(2)),
    compositeScore: await calcCompositeScore({
      uptimeRate,
      avgRating,
      inputPricePerMillion: latestPrice?.inputPricePerMillion ?? null,
    }),
    latestPrice,
  };
}

export async function listModels(params: { search?: string; family?: string; page?: number; pageSize?: number }) {
  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = params.pageSize && params.pageSize > 0 ? Math.min(params.pageSize, 100) : 20;

  const where = {
    ...(params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: "insensitive" as const } },
            { displayName: { contains: params.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(params.family ? { family: params.family } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.model.count({ where }),
    prisma.model.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { providerModels: true } },
        providerModels: {
          where: { inputPricePerMillion: { not: null } },
          orderBy: { inputPricePerMillion: "asc" },
          take: 1,
          select: { inputPricePerMillion: true, currency: true },
        },
      },
    }),
  ]);

  return {
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      displayName: item.displayName,
      family: item.family,
      provider: item.provider,
      contextWindow: item.contextWindow,
      deprecated: item.deprecated,
      providerCount: item._count.providerModels,
      minInputPrice: item.providerModels[0]
        ? {
            value: decimalToNumber(item.providerModels[0].inputPricePerMillion),
            currency: item.providerModels[0].currency,
          }
        : null,
    })),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getModelByIdOrName(idOrName: string) {
  return prisma.model.findFirst({
    where: {
      OR: [{ id: idOrName }, { name: idOrName }],
    },
    include: {
      _count: { select: { providerModels: true } },
    },
  });
}

export async function getModelProviders(idOrName: string) {
  const model = await getModelByIdOrName(idOrName);
  if (!model) return null;

  const providers = await prisma.providerModel.findMany({
    where: { modelId: model.id },
    orderBy: { inputPricePerMillion: "asc" },
    include: {
      provider: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
        },
      },
    },
  });

  const rows = await Promise.all(
    providers.map(async (item) => ({
      id: item.id,
      provider: item.provider,
      providerModelName: item.providerModelName,
      inputPricePerMillion: decimalToNumber(item.inputPricePerMillion),
      outputPricePerMillion: decimalToNumber(item.outputPricePerMillion),
      currency: item.currency,
      isAvailable: item.isAvailable,
      uptime3d: Number((await getProviderUptime(item.providerId, 3) * 100).toFixed(2)),
      updatedAt: item.updatedAt.toISOString(),
    })),
  );

  return {
    model: {
      id: model.id,
      name: model.name,
      displayName: model.displayName,
      family: model.family,
      providerCount: model._count.providerModels,
    },
    providers: rows,
  };
}

export async function listProviderModels(params: { providerId?: string; modelId?: string; page?: number; pageSize?: number }) {
  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = params.pageSize && params.pageSize > 0 ? Math.min(params.pageSize, 100) : 20;
  const where = {
    ...(params.providerId ? { providerId: params.providerId } : {}),
    ...(params.modelId ? { modelId: params.modelId } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.providerModel.count({ where }),
    prisma.providerModel.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { updatedAt: "desc" },
      include: {
        provider: { select: { id: true, name: true, slug: true } },
        model: { select: { id: true, name: true, displayName: true } },
      },
    }),
  ]);

  return {
    items: items.map((item) => ({
      id: item.id,
      provider: item.provider,
      model: item.model,
      providerModelName: item.providerModelName,
      inputPricePerMillion: decimalToNumber(item.inputPricePerMillion),
      outputPricePerMillion: decimalToNumber(item.outputPricePerMillion),
      currency: item.currency,
      isAvailable: item.isAvailable,
      updatedAt: item.updatedAt.toISOString(),
    })),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function listProviderModelPriceHistory(id: string, limit = 50) {
  const providerModel = await prisma.providerModel.findUnique({
    where: { id },
    include: {
      provider: { select: { id: true, name: true, slug: true } },
      model: { select: { id: true, name: true, displayName: true } },
    },
  });

  if (!providerModel) return null;

  const history = await prisma.priceHistory.findMany({
    where: { providerModelId: id },
    orderBy: { recordedAt: "desc" },
    take: Math.min(limit, 200),
  });

  return {
    providerModel: {
      id: providerModel.id,
      provider: providerModel.provider,
      model: providerModel.model,
      providerModelName: providerModel.providerModelName,
    },
    history: history.map((item) => ({
      id: item.id,
      inputPricePerMillion: decimalToNumber(item.inputPricePerMillion),
      outputPricePerMillion: decimalToNumber(item.outputPricePerMillion),
      currency: item.currency,
      changeType: item.changeType,
      changePercent: decimalToNumber(item.changePercent),
      recordedAt: item.recordedAt.toISOString(),
      notes: item.notes,
    })),
  };
}

export async function getProviderModelById(id: string) {
  return prisma.providerModel.findUnique({
    where: { id },
    include: {
      provider: { select: { id: true, name: true, slug: true } },
      model: { select: { id: true, name: true, displayName: true } },
    },
  });
}

export async function updateProviderModelPrice(input: {
  id: string;
  inputPricePerMillion?: number | null;
  outputPricePerMillion?: number | null;
  isAvailable?: boolean;
  notes?: string;
}) {
  const existing = await prisma.providerModel.findUnique({
    where: { id: input.id },
  });
  if (!existing) return null;

  const nextInput =
    input.inputPricePerMillion === undefined
      ? existing.inputPricePerMillion
      : input.inputPricePerMillion;
  const nextOutput =
    input.outputPricePerMillion === undefined
      ? existing.outputPricePerMillion
      : input.outputPricePerMillion;

  const prevInput = decimalToNumber(existing.inputPricePerMillion);
  const inValue = nextInput === null ? null : Number(nextInput);
  const outValue = nextOutput === null ? null : Number(nextOutput);

  let changeType: PriceChangeType = PriceChangeType.NO_CHANGE;
  if (prevInput === null && inValue !== null) {
    changeType = PriceChangeType.INITIAL;
  } else if ((prevInput ?? 0) < (inValue ?? 0)) {
    changeType = PriceChangeType.INCREASE;
  } else if ((prevInput ?? 0) > (inValue ?? 0)) {
    changeType = PriceChangeType.DECREASE;
  }

  const updated = await prisma.providerModel.update({
    where: { id: input.id },
    data: {
      inputPricePerMillion: inValue,
      outputPricePerMillion: outValue,
      isAvailable:
        input.isAvailable === undefined ? existing.isAvailable : input.isAvailable,
      notes: input.notes ?? existing.notes,
      lastCheckedAt: new Date(),
    },
    include: {
      provider: { select: { id: true, name: true, slug: true } },
      model: { select: { id: true, name: true, displayName: true } },
    },
  });

  if (changeType !== PriceChangeType.NO_CHANGE) {
    const percent =
      prevInput && inValue
        ? Number((((inValue - prevInput) / prevInput) * 100).toFixed(2))
        : null;
    await prisma.priceHistory.create({
      data: {
        providerId: updated.providerId,
        providerModelId: updated.id,
        inputPricePerMillion: inValue,
        outputPricePerMillion: outValue,
        currency: updated.currency,
        changeType,
        changePercent: percent,
        notes: input.notes ?? "updated via api",
      },
    });
  }

  return {
    id: updated.id,
    provider: updated.provider,
    model: updated.model,
    inputPricePerMillion: decimalToNumber(updated.inputPricePerMillion),
    outputPricePerMillion: decimalToNumber(updated.outputPricePerMillion),
    currency: updated.currency,
    isAvailable: updated.isAvailable,
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function listPriceHistory(params: {
  providerId?: string;
  modelId?: string;
  days?: number;
  page?: number;
  pageSize?: number;
}) {
  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = params.pageSize && params.pageSize > 0 ? Math.min(params.pageSize, 100) : 20;
  const days = params.days && params.days > 0 ? params.days : 30;
  const startAt = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const where: Prisma.PriceHistoryWhereInput = {
    recordedAt: { gte: startAt },
    ...(params.providerId ? { providerId: params.providerId } : {}),
    ...(params.modelId
      ? {
          providerModel: {
            modelId: params.modelId,
          },
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.priceHistory.count({ where }),
    prisma.priceHistory.findMany({
      where,
      orderBy: { recordedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        provider: { select: { id: true, name: true, slug: true } },
        providerModel: {
          include: {
            model: { select: { id: true, name: true, displayName: true } },
          },
        },
      },
    }),
  ]);

  return {
    items: rows.map((item) => ({
      id: item.id,
      recordedAt: item.recordedAt.toISOString(),
      provider: item.provider,
      model: item.providerModel.model,
      providerModelId: item.providerModelId,
      inputPricePerMillion: decimalToNumber(item.inputPricePerMillion),
      outputPricePerMillion: decimalToNumber(item.outputPricePerMillion),
      currency: item.currency,
      changeType: item.changeType,
      changePercent: decimalToNumber(item.changePercent),
      notes: item.notes,
    })),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getPriceTrendSummary(days = 30) {
  const history = await listPriceHistory({ days, page: 1, pageSize: 500 });
  const increaseCount = history.items.filter((item) => item.changeType === PriceChangeType.INCREASE).length;
  const decreaseCount = history.items.filter((item) => item.changeType === PriceChangeType.DECREASE).length;
  const neutralCount = history.items.filter((item) => item.changeType === PriceChangeType.NO_CHANGE).length;
  const changePercents = history.items
    .map((item) => item.changePercent)
    .filter((item): item is number => item !== null);
  const avgChangePercent =
    changePercents.length > 0
      ? Number(
          (
            changePercents.reduce((sum, item) => sum + Math.abs(item), 0) /
            changePercents.length
          ).toFixed(2),
        )
      : 0;

  const latestByProviderModel = new Map<
    string,
    {
      provider: string;
      model: string;
      price: number | null;
      recordedAt: string;
    }
  >();

  for (const item of history.items) {
    if (latestByProviderModel.has(item.providerModelId)) continue;
    latestByProviderModel.set(item.providerModelId, {
      provider: item.provider.name,
      model: item.model.displayName,
      price: item.inputPricePerMillion,
      recordedAt: item.recordedAt,
    });
  }

  return {
    days,
    stats: {
      totalChanges: history.total,
      increaseCount,
      decreaseCount,
      neutralCount,
      avgChangePercent,
    },
    latestSnapshots: Array.from(latestByProviderModel.values()).slice(0, 20),
  };
}

export async function listProbes(params: {
  providerId?: string;
  providerModelId?: string;
  days?: number;
  page?: number;
  pageSize?: number;
}) {
  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = params.pageSize && params.pageSize > 0 ? Math.min(params.pageSize, 100) : 20;
  const days = params.days && params.days > 0 ? params.days : 7;
  const startAt = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const where: Prisma.AvailabilityProbeWhereInput = {
    probedAt: { gte: startAt },
    ...(params.providerId ? { providerId: params.providerId } : {}),
    ...(params.providerModelId ? { providerModelId: params.providerModelId } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.availabilityProbe.count({ where }),
    prisma.availabilityProbe.findMany({
      where,
      orderBy: { probedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        provider: { select: { id: true, name: true, slug: true } },
      },
    }),
  ]);

  return {
    items: rows.map((item) => ({
      id: item.id,
      provider: item.provider,
      providerModelId: item.providerModelId,
      probeType: item.probeType,
      probeMethod: item.probeMethod,
      isSuccessful: item.isSuccessful,
      responseTime: item.responseTime,
      statusCode: item.statusCode,
      errorMessage: item.errorMessage,
      probedAt: item.probedAt.toISOString(),
    })),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function createProbe(input: {
  providerId: string;
  providerModelId?: string;
  probeType: ProbeType;
  probeMethod?: ProbeMethod;
  isSuccessful: boolean;
  responseTime?: number;
  statusCode?: number;
  errorMessage?: string;
}) {
  const record = await prisma.availabilityProbe.create({
    data: {
      providerId: input.providerId,
      providerModelId: input.providerModelId,
      probeType: input.probeType,
      probeMethod: input.probeMethod ?? ProbeMethod.MANUAL,
      isSuccessful: input.isSuccessful,
      responseTime: input.responseTime,
      statusCode: input.statusCode,
      errorMessage: input.errorMessage,
    },
    include: {
      provider: { select: { id: true, name: true, slug: true } },
    },
  });

  return {
    id: record.id,
    provider: record.provider,
    providerModelId: record.providerModelId,
    probeType: record.probeType,
    probeMethod: record.probeMethod,
    isSuccessful: record.isSuccessful,
    responseTime: record.responseTime,
    statusCode: record.statusCode,
    errorMessage: record.errorMessage,
    probedAt: record.probedAt.toISOString(),
  };
}

export async function getLatencySummary(days = 3) {
  const startAt = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const providers = await prisma.provider.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });

  const rows = await Promise.all(
    providers.map(async (provider) => {
      const aggregates = await prisma.availabilityProbe.aggregate({
        where: {
          providerId: provider.id,
          probedAt: { gte: startAt },
          responseTime: { not: null },
        },
        _avg: { responseTime: true },
        _max: { responseTime: true },
        _min: { responseTime: true },
        _count: { responseTime: true },
      });

      return {
        provider,
        sampleCount: aggregates._count.responseTime,
        avgResponseTime: aggregates._avg.responseTime
          ? Number(aggregates._avg.responseTime.toFixed(0))
          : null,
        maxResponseTime: aggregates._max.responseTime ?? null,
        minResponseTime: aggregates._min.responseTime ?? null,
      };
    }),
  );

  return {
    days,
    generatedAt: new Date().toISOString(),
    items: rows,
  };
}

export async function compareProviders(providerIds: string[]) {
  const uniqueIds = Array.from(new Set(providerIds));
  const providers = await prisma.provider.findMany({
    where: { id: { in: uniqueIds } },
    include: {
      reviews: { select: { rating: true } },
      _count: { select: { models: true } },
      models: {
        take: 1,
        orderBy: { updatedAt: "desc" },
        select: { inputPricePerMillion: true },
      },
    },
  });

  const rows = await Promise.all(
    providers.map(async (provider) => {
      const avgRating =
        provider.reviews.length > 0
          ? provider.reviews.reduce((sum, review) => sum + review.rating, 0) /
            provider.reviews.length
          : null;
      const uptimeRate = await getProviderUptime(provider.id, 3);
      return {
        id: provider.id,
        name: provider.name,
        slug: provider.slug,
        modelCount: provider._count.models,
        avgRating: avgRating ? Number(avgRating.toFixed(2)) : null,
        uptime3d: Number((uptimeRate * 100).toFixed(2)),
        compositeScore: await calcCompositeScore({
          uptimeRate,
          avgRating,
          inputPricePerMillion: provider.models[0]
            ? decimalToNumber(provider.models[0].inputPricePerMillion)
            : null,
        }),
      };
    }),
  );

  return rows.sort((a, b) => b.compositeScore - a.compositeScore);
}

export async function getProviderRankings(limit = 20) {
  const providers = await prisma.provider.findMany({
    include: {
      reviews: { select: { rating: true } },
      models: {
        take: 1,
        orderBy: { updatedAt: "desc" },
        select: { inputPricePerMillion: true },
      },
    },
  });

  const rows = await Promise.all(
    providers.map(async (provider) => {
      const avgRating =
        provider.reviews.length > 0
          ? provider.reviews.reduce((sum, review) => sum + review.rating, 0) / provider.reviews.length
          : null;
      const uptimeRate = await getProviderUptime(provider.id, 3);
      return {
        id: provider.id,
        name: provider.name,
        slug: provider.slug,
        uptime3d: Number((uptimeRate * 100).toFixed(2)),
        avgRating: avgRating ? Number(avgRating.toFixed(2)) : null,
        compositeScore: await calcCompositeScore({
          uptimeRate,
          avgRating,
          inputPricePerMillion: provider.models[0]
            ? decimalToNumber(provider.models[0].inputPricePerMillion)
            : null,
        }),
      };
    }),
  );

  return rows.sort((a, b) => b.compositeScore - a.compositeScore).slice(0, Math.min(limit, 100));
}

export async function getUptimeSummary(days = 3) {
  const startAt = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const providers = await prisma.provider.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });

  const rows = await Promise.all(
    providers.map(async (provider) => {
      const [total, success, avgResponse] = await Promise.all([
        prisma.availabilityProbe.count({ where: { providerId: provider.id, probedAt: { gte: startAt } } }),
        prisma.availabilityProbe.count({ where: { providerId: provider.id, isSuccessful: true, probedAt: { gte: startAt } } }),
        prisma.availabilityProbe.aggregate({
          where: { providerId: provider.id, probedAt: { gte: startAt }, responseTime: { not: null } },
          _avg: { responseTime: true },
        }),
      ]);

      const uptime = total > 0 ? (success / total) * 100 : 100;
      return {
        provider,
        totalProbes: total,
        successfulProbes: success,
        uptime: Number(uptime.toFixed(2)),
        avgResponseTime: avgResponse._avg.responseTime ? Number(avgResponse._avg.responseTime.toFixed(0)) : null,
      };
    }),
  );

  return {
    days,
    generatedAt: new Date().toISOString(),
    items: rows,
  };
}

export async function getDashboardData() {
  const [providerCount, modelCount, topProviders, recentPriceHistory] = await Promise.all([
    prisma.provider.count(),
    prisma.model.count(),
    getProviderRankings(5),
    prisma.priceHistory.findMany({
      orderBy: { recordedAt: "desc" },
      take: 10,
      include: {
        provider: { select: { name: true } },
        providerModel: { include: { model: { select: { displayName: true } } } },
      },
    }),
  ]);

  const uptimeSummary = await getUptimeSummary(3);
  const platformUptime =
    uptimeSummary.items.length > 0
      ? uptimeSummary.items.reduce((sum, item) => sum + item.uptime, 0) / uptimeSummary.items.length
      : 100;

  return {
    stats: {
      providerCount,
      modelCount,
      platformUptime3d: Number(platformUptime.toFixed(2)),
      priceChangeCount24h: recentPriceHistory.filter((item) => item.recordedAt >= new Date(Date.now() - 24 * 60 * 60 * 1000)).length,
    },
    topProviders,
    recentPriceHistory: recentPriceHistory.map((item) => ({
      id: item.id,
      recordedAt: item.recordedAt.toISOString(),
      provider: item.provider.name,
      model: item.providerModel.model.displayName,
      inputPricePerMillion: decimalToNumber(item.inputPricePerMillion),
      outputPricePerMillion: decimalToNumber(item.outputPricePerMillion),
      currency: item.currency,
      changeType: item.changeType,
    })),
  };
}

export async function createProvider(input: {
  name: string;
  slug: string;
  website: string;
  description?: string;
  country?: string;
  status?: ProviderStatus;
}) {
  const provider = await prisma.provider.create({
    data: {
      name: input.name,
      slug: input.slug,
      website: input.website,
      description: input.description,
      country: input.country,
      status: input.status ?? ProviderStatus.ACTIVE,
    },
  });

  return provider;
}

export async function updateProvider(
  idOrSlug: string,
  input: {
    name?: string;
    slug?: string;
    website?: string;
    description?: string | null;
    country?: string | null;
    status?: ProviderStatus;
  },
) {
  const existing = await prisma.provider.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
  });
  if (!existing) return null;

  return prisma.provider.update({
    where: { id: existing.id },
    data: {
      name: input.name,
      slug: input.slug,
      website: input.website,
      description: input.description,
      country: input.country,
      status: input.status,
    },
  });
}

export async function deleteProvider(idOrSlug: string) {
  const existing = await prisma.provider.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    select: { id: true },
  });
  if (!existing) return null;

  await prisma.provider.delete({ where: { id: existing.id } });
  return { id: existing.id };
}

export async function createModel(input: {
  name: string;
  displayName: string;
  family: string;
  provider: string;
  contextWindow?: number;
  maxOutput?: number;
  modality?: string[];
  description?: string;
}) {
  return prisma.model.create({
    data: {
      name: input.name,
      displayName: input.displayName,
      family: input.family,
      provider: input.provider,
      contextWindow: input.contextWindow,
      maxOutput: input.maxOutput,
      modality: input.modality?.length ? input.modality : ["text"],
      description: input.description,
    },
  });
}

export async function updateModel(
  idOrName: string,
  input: {
    displayName?: string;
    family?: string;
    provider?: string;
    contextWindow?: number | null;
    maxOutput?: number | null;
    modality?: string[];
    description?: string | null;
    deprecated?: boolean;
  },
) {
  const existing = await prisma.model.findFirst({
    where: { OR: [{ id: idOrName }, { name: idOrName }] },
  });
  if (!existing) return null;

  return prisma.model.update({
    where: { id: existing.id },
    data: {
      displayName: input.displayName,
      family: input.family,
      provider: input.provider,
      contextWindow: input.contextWindow,
      maxOutput: input.maxOutput,
      modality: input.modality,
      description: input.description,
      deprecated: input.deprecated,
    },
  });
}

export async function listReviews(params: {
  providerId?: string;
  minRating?: number;
  maxRating?: number;
  page?: number;
  pageSize?: number;
}) {
  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = params.pageSize && params.pageSize > 0 ? Math.min(params.pageSize, 100) : 20;

  const where: Prisma.ReviewWhereInput = {
    ...(params.providerId ? { providerId: params.providerId } : {}),
    ...(params.minRating || params.maxRating
      ? {
          rating: {
            ...(params.minRating ? { gte: params.minRating } : {}),
            ...(params.maxRating ? { lte: params.maxRating } : {}),
          },
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        provider: { select: { id: true, name: true, slug: true } },
      },
    }),
  ]);

  return {
    items: rows,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function createReview(input: {
  providerId: string;
  rating: number;
  title?: string;
  content: string;
  pros?: string[];
  cons?: string[];
  reviewerName?: string;
  reviewerRole?: string;
}) {
  return prisma.review.create({
    data: {
      providerId: input.providerId,
      rating: input.rating,
      title: input.title,
      content: input.content,
      pros: input.pros ?? [],
      cons: input.cons ?? [],
      reviewerName: input.reviewerName,
      reviewerRole: input.reviewerRole,
    },
    include: {
      provider: { select: { id: true, name: true, slug: true } },
    },
  });
}

export async function updateReview(
  id: string,
  input: {
    rating?: number;
    title?: string | null;
    content?: string;
    pros?: string[];
    cons?: string[];
    reviewerName?: string | null;
    reviewerRole?: string | null;
  },
) {
  const existing = await prisma.review.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;

  return prisma.review.update({
    where: { id },
    data: {
      rating: input.rating,
      title: input.title,
      content: input.content,
      pros: input.pros,
      cons: input.cons,
      reviewerName: input.reviewerName,
      reviewerRole: input.reviewerRole,
    },
    include: {
      provider: { select: { id: true, name: true, slug: true } },
    },
  });
}

export async function deleteReview(id: string) {
  const existing = await prisma.review.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;

  await prisma.review.delete({ where: { id } });
  return { id };
}
