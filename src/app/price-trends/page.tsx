export const dynamic = "force-dynamic";

import { SiteShell } from "@/components/layout/site-shell";
import { MetricCard, Panel, SimpleTable } from "@/components/ui/blocks";
import { getPriceTrendSummary, listPriceHistory } from "@/lib/server/data";

export default async function PriceTrendsPage() {
  const [summary, history] = await Promise.all([
    getPriceTrendSummary(30),
    listPriceHistory({ days: 30, page: 1, pageSize: 30 }),
  ]);

  const rows = history.items.map((item) => [
    item.recordedAt.replace("T", " ").slice(0, 16),
    item.provider.name,
    item.model.displayName,
    item.changeType,
    item.changePercent !== null ? `${item.changePercent}%` : "-",
  ]);

  return (
    <SiteShell title="价格趋势" description="查看模型和服务商维度的历史价格波动。">
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="30天变更总数" value={`${summary.stats.totalChanges}`} hint="PriceHistory 聚合" />
        <MetricCard label="上涨次数" value={`${summary.stats.increaseCount}`} hint="INCREASE" />
        <MetricCard label="下调次数" value={`${summary.stats.decreaseCount}`} hint="DECREASE" />
        <MetricCard label="平均波动" value={`${summary.stats.avgChangePercent}%`} hint="绝对值均值" />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="趋势主图占位">
            <div className="h-52 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
              下一步接折线图：按模型/服务商分组展示 30 天变化
            </div>
          </Panel>
        </div>
        <Panel title="最新快照">
          <ul className="space-y-2 text-sm text-gray-700">
            {summary.latestSnapshots.slice(0, 6).map((item, index) => (
              <li key={`${item.provider}-${item.model}-${index}`} className="rounded border border-gray-200 px-3 py-2">
                <div className="font-medium">{item.provider} / {item.model}</div>
                <div className="text-xs text-gray-500">{item.price ?? "-"} @ {item.recordedAt.replace("T", " ").slice(0, 16)}</div>
              </li>
            ))}
          </ul>
        </Panel>
      </section>
      <section className="mt-4">
        <Panel title="价格变更时间线（最近30条）">
          <SimpleTable headers={["时间", "服务商", "模型", "类型", "变化%"]} rows={rows} />
        </Panel>
      </section>
    </SiteShell>
  );
}
