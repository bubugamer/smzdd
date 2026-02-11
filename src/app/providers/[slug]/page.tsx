export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { SiteShell } from "@/components/layout/site-shell";
import { MetricCard, Panel, SimpleTable } from "@/components/ui/blocks";
import { getProviderByIdOrSlug, getProviderOverview } from "@/lib/server/data";

export default async function ProviderDetailPage({ params }: { params: { slug: string } }) {
  const [overview, provider] = await Promise.all([getProviderOverview(params.slug), getProviderByIdOrSlug(params.slug)]);

  if (!overview || !provider) {
    notFound();
  }

  const modelRows = provider.models.map((item) => [
    item.model.displayName,
    item.inputPricePerMillion ? `${item.inputPricePerMillion}` : "-",
    item.outputPricePerMillion ? `${item.outputPricePerMillion}` : "-",
    item.currency,
    item.isAvailable ? "可用" : "不可用",
  ]);

  const probeRows = provider.probes.slice(0, 10).map((item) => [
    item.probeType,
    item.isSuccessful ? "成功" : "失败",
    item.responseTime ? `${item.responseTime}ms` : "-",
    item.statusCode ? `${item.statusCode}` : "-",
    item.probedAt.toISOString().replace("T", " ").slice(0, 16),
  ]);

  return (
    <SiteShell title={`服务商详情: ${overview.name}`} description="服务商能力、定价、探针记录和评价聚合。">
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="综合评分" value={`${overview.compositeScore}`} hint={`状态: ${overview.status}`} />
        <MetricCard label="3日可用率" value={`${overview.uptime3d}%`} hint={`评分: ${overview.avgRating ?? "暂无"}/5`} />
        <MetricCard label="支持模型" value={`${overview.modelCount}`} hint={`探针数: ${overview.probeCount}`} />
      </section>
      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="支持模型定价">
          <SimpleTable headers={["模型", "输入价", "输出价", "货币", "可用"]} rows={modelRows} />
        </Panel>
        <Panel title="探针记录（最近10条）">
          <SimpleTable headers={["类型", "状态", "响应", "状态码", "时间"]} rows={probeRows} />
        </Panel>
      </section>
    </SiteShell>
  );
}
