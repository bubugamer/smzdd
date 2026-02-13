export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/layout/site-shell";
import { MetricCard, Panel, SimpleTable } from "@/components/ui/blocks";
import { CopyButton } from "@/components/ui/copy-button";
import { ReviewSubmitForm } from "@/components/providers/review-submit-form";
import { getProviderByIdOrSlug, getProviderOverview } from "@/lib/server/data";

export default async function ProviderDetailPage({ params }: { params: { slug: string } }) {
  const [overview, provider] = await Promise.all([getProviderOverview(params.slug), getProviderByIdOrSlug(params.slug)]);

  if (!overview || !provider) {
    notFound();
  }

  const formatPrice = (value: number | null) => {
    if (value === null || value === undefined) return "-";
    return value.toFixed(4);
  };

  const formatDateTime = (value: Date) => value.toISOString().replace("T", " ").slice(0, 16);

  const latestModelUpdate = provider.models[0]?.updatedAt ?? null;
  const latestProbeUpdate = provider.probes[0]?.probedAt ?? null;
  const latestUpdate = [provider.updatedAt, latestModelUpdate, latestProbeUpdate]
    .filter((item): item is Date => Boolean(item))
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? provider.updatedAt;

  const sortedModels = [...provider.models].sort((a, b) => {
    if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });

  const modelRows = sortedModels.map((item) => [
    item.model.displayName,
    item.providerModelName,
    formatPrice(item.inputPricePerMillion ? Number(item.inputPricePerMillion) : null),
    formatPrice(item.outputPricePerMillion ? Number(item.outputPricePerMillion) : null),
    item.currency,
    item.isAvailable ? "可用" : "不可用",
    formatDateTime(item.updatedAt),
  ]);

  const recentProbes = provider.probes.slice(0, 20);
  const probeTotal = recentProbes.length;
  const probeSuccess = recentProbes.filter((item) => item.isSuccessful).length;
  const probeFailures = probeTotal - probeSuccess;
  const probeSuccessRate = probeTotal > 0 ? ((probeSuccess / probeTotal) * 100).toFixed(2) : "0.00";
  const responseRows = recentProbes.filter((item) => item.responseTime !== null);
  const avgResponseMs = responseRows.length > 0
    ? Math.round(responseRows.reduce((sum, item) => sum + Number(item.responseTime), 0) / responseRows.length)
    : null;

  const probeRows = provider.probes.slice(0, 10).map((item) => [
    item.probeType,
    item.isSuccessful ? "成功" : "失败",
    item.responseTime ? `${item.responseTime}ms` : "-",
    item.statusCode ? `${item.statusCode}` : "-",
    item.errorMessage || "-",
    formatDateTime(item.probedAt),
  ]);

  const reviewRows = provider.reviews.slice(0, 10).map((item) => [
    item.reviewerName || "匿名用户",
    `${item.rating}/5`,
    item.title || "-",
    item.content ? item.content.slice(0, 80) : "-",
    formatDateTime(item.createdAt),
  ]);

  return (
    <SiteShell title={`服务商详情: ${overview.name}`} description="服务商能力、定价、探针记录和评价聚合。">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <Link className="rounded border border-gray-300 px-2 py-1 text-gray-700 hover:border-gray-400" href="/providers">
          返回服务商列表
        </Link>
        <a className="rounded border border-gray-300 px-2 py-1 text-gray-700 hover:border-gray-400" href="#basic">
          基础信息
        </a>
        <a className="rounded border border-gray-300 px-2 py-1 text-gray-700 hover:border-gray-400" href="#pricing">
          模型定价
        </a>
        <a className="rounded border border-gray-300 px-2 py-1 text-gray-700 hover:border-gray-400" href="#probes">
          探针记录
        </a>
        <a className="rounded border border-gray-300 px-2 py-1 text-gray-700 hover:border-gray-400" href="#reviews">
          评价信息
        </a>
      </div>

      <section className="mb-4">
        <Panel title="访问地址">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <a className="break-all font-medium text-[#e23b3b] hover:underline" href={overview.website} rel="noreferrer" target="_blank">
              {overview.website}
            </a>
            <CopyButton value={overview.website} />
          </div>
        </Panel>
      </section>

      <section className="mb-4" id="basic">
        <Panel title="基础信息">
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <div><span className="text-gray-500">名称：</span>{overview.name}</div>
            <div><span className="text-gray-500">Slug：</span>{overview.slug}</div>
            <div><span className="text-gray-500">状态：</span>{overview.status}</div>
            <div><span className="text-gray-500">最近更新：</span>{formatDateTime(latestUpdate)}</div>
            <div className="md:col-span-2"><span className="text-gray-500">描述：</span>{overview.description || "-"}</div>
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="综合评分" value={`${overview.compositeScore}`} hint={`状态: ${overview.status}`} />
        <MetricCard label="3日可用率" value={`${overview.uptime3d}%`} hint={`评分: ${overview.avgRating ?? "暂无"}/5`} />
        <MetricCard label="支持模型" value={`${overview.modelCount}`} hint={`探针数: ${overview.probeCount}`} />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2" id="pricing">
        <Panel title="支持模型定价">
          <SimpleTable headers={["模型", "服务商模型名", "输入价", "输出价", "货币", "可用", "更新时间"]} rows={modelRows} />
        </Panel>
        <Panel
          title="探针摘要（最近20条）"
          action={<span className="text-xs text-gray-500">最近更新时间: {latestProbeUpdate ? formatDateTime(latestProbeUpdate) : "-"}</span>}
        >
          <div className="grid gap-3 text-sm md:grid-cols-3">
            <div className="rounded border border-gray-200 p-3">
              <div className="text-xs text-gray-500">成功率</div>
              <div className="mt-1 text-lg font-semibold">{probeSuccessRate}%</div>
            </div>
            <div className="rounded border border-gray-200 p-3">
              <div className="text-xs text-gray-500">平均响应</div>
              <div className="mt-1 text-lg font-semibold">{avgResponseMs !== null ? `${avgResponseMs}ms` : "-"}</div>
            </div>
            <div className="rounded border border-gray-200 p-3">
              <div className="text-xs text-gray-500">失败次数</div>
              <div className="mt-1 text-lg font-semibold">{probeFailures}</div>
            </div>
          </div>
        </Panel>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2" id="probes">
        <Panel title="探针记录（最近10条）">
          <SimpleTable headers={["类型", "状态", "响应", "状态码", "错误信息", "时间"]} rows={probeRows} />
        </Panel>
      </section>

      <section className="mt-4" id="reviews">
        <Panel title="最近评价（10条）">
          {reviewRows.length > 0 ? (
            <SimpleTable headers={["昵称", "评分", "标题", "内容", "时间"]} rows={reviewRows} />
          ) : (
            <div className="rounded border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              暂无评价数据
            </div>
          )}
          <ReviewSubmitForm providerId={provider.id} />
        </Panel>
      </section>
    </SiteShell>
  );
}
