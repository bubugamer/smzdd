export const dynamic = "force-dynamic";

import { SiteShell } from "@/components/layout/site-shell";
import { MetricCard, Panel, SimpleTable } from "@/components/ui/blocks";
import { getDashboardData } from "@/lib/server/data";

export default async function HomePage() {
  const data = await getDashboardData();

  const providerRows = data.topProviders.map((item) => [
    item.name,
    `${item.compositeScore}`,
    `${item.uptime3d}%`,
    item.avgRating ? `${item.avgRating}/5` : "暂无",
  ]);

  const priceRows = data.recentPriceHistory.map((item) => [
    item.recordedAt.replace("T", " ").slice(0, 16),
    item.provider,
    item.model,
    `${item.inputPricePerMillion ?? "-"}/${item.outputPricePerMillion ?? "-"} ${item.currency}`,
  ]);

  return (
    <SiteShell title="数据总览" description="平台关键指标、服务商表现和最近价格变动。">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="服务商数量" value={`${data.stats.providerCount}`} hint="实时统计" />
        <MetricCard label="活跃模型" value={`${data.stats.modelCount}`} hint="实时统计" />
        <MetricCard label="3日平台可用率" value={`${data.stats.platformUptime3d}%`} hint="基于探针聚合" />
        <MetricCard label="24h 调价次数" value={`${data.stats.priceChangeCount24h}`} hint="价格快照统计" />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Top 服务商（综合分）">
          <SimpleTable headers={["服务商", "综合分", "可用率", "评分"]} rows={providerRows} />
        </Panel>
        <div className="lg:col-span-2">
          <Panel title="价格变动时间线">
            <SimpleTable headers={["时间", "服务商", "模型", "当前输入/输出价"]} rows={priceRows} />
          </Panel>
        </div>
      </section>
    </SiteShell>
  );
}
