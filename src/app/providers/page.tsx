export const dynamic = "force-dynamic";

import Link from "next/link";
import { ProviderStatus } from "@prisma/client";
import { SiteShell } from "@/components/layout/site-shell";
import { Panel, SimpleTable } from "@/components/ui/blocks";
import { listProviders } from "@/lib/server/data";
import prisma from "@/lib/db";
import { readAdminSettings } from "@/lib/server/settings";

const DEFAULT_SAMPLE_MODEL = "gpt-5.2";
const SORT_BY_OPTIONS = [
  { value: "compositeScore", label: "综合评分" },
  { value: "uptime3d", label: "3日可用率" },
  { value: "inputPrice", label: "样例输入价" },
  { value: "outputPrice", label: "样例输出价" },
  { value: "updatedAt", label: "更新时间" },
  { value: "name", label: "服务商名称" },
  { value: "sampleModel", label: "样例模型" },
  { value: "status", label: "状态" },
] as const;

function singleQueryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseSelected(raw: string | undefined) {
  if (!raw) return [];
  return raw.split(",").map((item) => item.trim()).filter(Boolean);
}

export default async function ProvidersPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const search = singleQueryValue(searchParams?.search)?.trim() ?? "";
  const status = singleQueryValue(searchParams?.status)?.toUpperCase() ?? "";
  const sortByRaw = singleQueryValue(searchParams?.sortBy) ?? "compositeScore";
  const sortOrderRaw = singleQueryValue(searchParams?.sortOrder)?.toLowerCase() ?? "desc";
  const pageRaw = Number(singleQueryValue(searchParams?.page) ?? "1");
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const selectedSlugs = parseSelected(singleQueryValue(searchParams?.selected));
  const selectedSet = new Set(selectedSlugs);

  const validSortBy = new Set(SORT_BY_OPTIONS.map((item) => item.value));
  const sortBy = validSortBy.has(sortByRaw as (typeof SORT_BY_OPTIONS)[number]["value"])
    ? (sortByRaw as (typeof SORT_BY_OPTIONS)[number]["value"])
    : "compositeScore";
  const sortOrder = sortOrderRaw === "asc" ? "asc" : "desc";

  const adminSettings = await readAdminSettings();
  const sampleModel = adminSettings.sampleModel || DEFAULT_SAMPLE_MODEL;

  const [providers, providerOptions] = await Promise.all([
    listProviders({
      search: search || undefined,
      status: status ? (status as ProviderStatus) : undefined,
      selectedSlugs,
      sortBy,
      sortOrder,
      sampleModel,
      page,
      pageSize: 20,
    }),
    prisma.provider.findMany({
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const baseState = {
    search,
    status,
    sortBy,
    sortOrder,
    selected: selectedSlugs.join(","),
  };

  const buildHref = (patch: Record<string, string | null | undefined>) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...baseState, ...patch })) {
      if (value) params.set(key, value);
    }
    return `/providers?${params.toString()}`;
  };

  const renderSortableHeader = (
    label: string,
    targetSortBy: (typeof SORT_BY_OPTIONS)[number]["value"],
  ) => (
    <span className="inline-flex items-center gap-2">
      <span>{label}</span>
      <span className="inline-flex items-center gap-1 text-[11px] normal-case tracking-normal">
        <Link
          aria-label={`${label} 升序`}
          className={`rounded px-1 ${sortBy === targetSortBy && sortOrder === "asc" ? "bg-red-100 text-[#e23b3b]" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"}`}
          href={buildHref({ sortBy: targetSortBy, sortOrder: "asc", page: "1" })}
        >
          ↑
        </Link>
        <Link
          aria-label={`${label} 降序`}
          className={`rounded px-1 ${sortBy === targetSortBy && sortOrder === "desc" ? "bg-red-100 text-[#e23b3b]" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"}`}
          href={buildHref({ sortBy: targetSortBy, sortOrder: "desc", page: "1" })}
        >
          ↓
        </Link>
      </span>
    </span>
  );

  const formatPrice = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    return value.toFixed(4);
  };

  const rows = providers.items.map((item) => [
    <Link key={`${item.id}-name`} className="font-medium text-[#e23b3b] hover:underline" href={`/providers/${item.slug}`}>
      {item.name}
    </Link>,
    `${item.compositeScore}`,
    `${item.uptime3d}%`,
    item.samplePricing?.modelDisplayName ?? "-",
    item.samplePricing
      ? `${formatPrice(item.samplePricing.inputPricePerMillion)}/${formatPrice(item.samplePricing.outputPricePerMillion)} ${item.samplePricing.currency}`
      : "-",
    item.status,
  ]);

  return (
    <SiteShell title="服务商列表" description="按评分、可用率和价格筛选服务商。">
      <Panel
        title="筛选、排序与服务商选择"
        action={
          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-[#e23b3b]">
            已选 {selectedSlugs.length} 家
          </span>
        }
      >
        <form className="grid gap-2 md:grid-cols-4" method="GET">
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm md:col-span-2"
            defaultValue={search}
            name="search"
            placeholder="搜索服务商名称或 slug"
          />
          <select
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            defaultValue={status}
            name="status"
          >
            <option value="">全部状态</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="TESTING">TESTING</option>
            <option value="DEPRECATED">DEPRECATED</option>
          </select>
          {selectedSlugs.length > 0 ? <input name="selected" type="hidden" value={selectedSlugs.join(",")} /> : null}
          <input name="sortBy" type="hidden" value={sortBy} />
          <input name="sortOrder" type="hidden" value={sortOrder} />
          <Link className="rounded border border-gray-300 px-3 py-1 text-center text-sm text-gray-700 hover:border-gray-400" href="/providers">
            重置
          </Link>
        </form>

        <div className="mt-3 rounded-lg border border-gray-200 p-3">
          <div className="mb-2 text-xs text-gray-500">选择服务商（可多选）</div>
          <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
            {providerOptions.map((provider) => {
              const selected = selectedSet.has(provider.slug);
              const nextSelected = selected
                ? selectedSlugs.filter((slug) => slug !== provider.slug)
                : [...selectedSlugs, provider.slug];
              const href = buildHref({
                selected: nextSelected.length > 0 ? nextSelected.join(",") : null,
                page: "1",
              });

              return (
                <Link
                  key={provider.slug}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    selected
                      ? "border-red-200 bg-red-50 text-[#e23b3b]"
                      : "border-gray-200 text-gray-700 hover:border-red-200 hover:bg-red-50 hover:text-[#e23b3b]"
                  }`}
                  href={href}
                >
                  {provider.name}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-600">
          共 {providers.total} 家，当前第 {providers.page}/{providers.totalPages} 页。
        </div>
      </Panel>
      <div className="mt-4">
        <Panel title="服务商数据">
          <SimpleTable
            headers={[
              renderSortableHeader("服务商", "name"),
              renderSortableHeader("综合分", "compositeScore"),
              renderSortableHeader("3日可用率", "uptime3d"),
              renderSortableHeader("样例模型", "sampleModel"),
              renderSortableHeader("样例价格(输入/输出)", "inputPrice"),
              renderSortableHeader("状态", "status"),
            ]}
            rows={rows}
          />
          {providers.items.length === 0 ? (
            <div className="mt-3 rounded border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              当前筛选条件下没有结果，请调整筛选项或重置条件。
            </div>
          ) : null}
          <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
            <div>
              第 {providers.page}/{providers.totalPages} 页，共 {providers.total} 条
            </div>
            <div className="flex gap-2">
              <Link
                className={`rounded border px-2 py-1 ${providers.page <= 1 ? "pointer-events-none border-gray-200 text-gray-300" : "border-gray-300 text-gray-700"}`}
                href={buildHref({ page: String(Math.max(1, providers.page - 1)) })}
              >
                上一页
              </Link>
              <Link
                className={`rounded border px-2 py-1 ${providers.page >= providers.totalPages ? "pointer-events-none border-gray-200 text-gray-300" : "border-gray-300 text-gray-700"}`}
                href={buildHref({ page: String(Math.min(providers.totalPages, providers.page + 1)) })}
              >
                下一页
              </Link>
            </div>
          </div>
        </Panel>
      </div>
    </SiteShell>
  );
}
