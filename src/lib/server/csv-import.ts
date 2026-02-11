import Papa from "papaparse";
import { ProviderStatus } from "@prisma/client";
import prisma from "@/lib/db";

export type ImportEntity = "providers" | "models" | "providerModels";

type CsvImportInput = {
  entity: ImportEntity;
  csvText: string;
  dryRun?: boolean;
};

function toNumber(value: unknown) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toStringArray(value: unknown) {
  if (!value) return [];
  return String(value)
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function importFromCsv(input: CsvImportInput) {
  const parsed = Papa.parse<Record<string, unknown>>(input.csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    return {
      entity: input.entity,
      dryRun: input.dryRun ?? true,
      totalRows: 0,
      imported: 0,
      skipped: 0,
      errors: parsed.errors.map((item) => item.message),
      preview: [],
    };
  }

  const rows = parsed.data;
  const preview = rows.slice(0, 5);
  if (input.dryRun ?? true) {
    return {
      entity: input.entity,
      dryRun: true,
      totalRows: rows.length,
      imported: 0,
      skipped: 0,
      errors: [],
      preview,
    };
  }

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [index, row] of rows.entries()) {
    try {
      if (input.entity === "providers") {
        const name = String(row.name ?? "").trim();
        const slug = String(row.slug ?? "").trim();
        const website = String(row.website ?? "").trim();
        if (!name || !slug || !website) {
          skipped += 1;
          continue;
        }
        const statusRaw = String(row.status ?? "ACTIVE").toUpperCase();
        const status = Object.values(ProviderStatus).includes(statusRaw as ProviderStatus)
          ? (statusRaw as ProviderStatus)
          : ProviderStatus.ACTIVE;

        await prisma.provider.upsert({
          where: { slug },
          update: {
            name,
            website,
            status,
            description: row.description ? String(row.description) : undefined,
            country: row.country ? String(row.country) : undefined,
          },
          create: {
            name,
            slug,
            website,
            status,
            description: row.description ? String(row.description) : undefined,
            country: row.country ? String(row.country) : undefined,
          },
        });
        imported += 1;
        continue;
      }

      if (input.entity === "models") {
        const name = String(row.name ?? "").trim();
        const displayName = String(row.displayName ?? "").trim();
        const family = String(row.family ?? "").trim();
        const provider = String(row.provider ?? "").trim();
        if (!name || !displayName || !family || !provider) {
          skipped += 1;
          continue;
        }
        await prisma.model.upsert({
          where: { name },
          update: {
            displayName,
            family,
            provider,
            contextWindow: toNumber(row.contextWindow),
            maxOutput: toNumber(row.maxOutput),
            modality: toStringArray(row.modality),
            description: row.description ? String(row.description) : undefined,
            deprecated: String(row.deprecated ?? "false").toLowerCase() === "true",
          },
          create: {
            name,
            displayName,
            family,
            provider,
            contextWindow: toNumber(row.contextWindow),
            maxOutput: toNumber(row.maxOutput),
            modality: toStringArray(row.modality),
            description: row.description ? String(row.description) : undefined,
            deprecated: String(row.deprecated ?? "false").toLowerCase() === "true",
          },
        });
        imported += 1;
        continue;
      }

      const providerSlug = String(row.providerSlug ?? "").trim();
      const modelName = String(row.modelName ?? "").trim();
      const providerModelName = String(row.providerModelName ?? "").trim();
      if (!providerSlug || !modelName || !providerModelName) {
        skipped += 1;
        continue;
      }

      const provider = await prisma.provider.findUnique({
        where: { slug: providerSlug },
        select: { id: true },
      });
      const model = await prisma.model.findUnique({
        where: { name: modelName },
        select: { id: true },
      });
      if (!provider || !model) {
        skipped += 1;
        continue;
      }

      await prisma.providerModel.upsert({
        where: {
          providerId_modelId: {
            providerId: provider.id,
            modelId: model.id,
          },
        },
        update: {
          providerModelName,
          inputPricePerMillion: toNumber(row.inputPricePerMillion),
          outputPricePerMillion: toNumber(row.outputPricePerMillion),
          currency: String(row.currency ?? "USD"),
          isAvailable: String(row.isAvailable ?? "true").toLowerCase() !== "false",
        },
        create: {
          providerId: provider.id,
          modelId: model.id,
          providerModelName,
          inputPricePerMillion: toNumber(row.inputPricePerMillion),
          outputPricePerMillion: toNumber(row.outputPricePerMillion),
          currency: String(row.currency ?? "USD"),
          isAvailable: String(row.isAvailable ?? "true").toLowerCase() !== "false",
        },
      });
      imported += 1;
    } catch (error) {
      errors.push(`row ${index + 1}: ${(error as Error).message}`);
    }
  }

  return {
    entity: input.entity,
    dryRun: false,
    totalRows: rows.length,
    imported,
    skipped,
    errors,
    preview,
  };
}
