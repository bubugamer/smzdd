export const dynamic = "force-dynamic";

import { SiteShell } from "@/components/layout/site-shell";
import { MetricCard, Panel, SimpleTable } from "@/components/ui/blocks";
import { getProviderRankings } from "@/lib/server/data";

export default async function RankingsPage() {
  const rankings = await getProviderRankings(20);

  const top = rankings[0];
  const rows = rankings.map((item, index) => [
    `${index + 1}`,
    item.name,
    `${item.compositeScore}`,
    `${item.uptime3d}%`,
    item.avgRating ? `${item.avgRating}/5` : "暂无",
  ]);

  return (
    <SiteShell title="排行榜" description="综合评分、可用率和评分表现榜单。">
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="综合榜第一" value={top?.name ?? "-"} hint={`${top?.compositeScore ?? "-"}`} />
        <MetricCard label="第一名可用率" value={top ? `${top.uptime3d}%` : "-"} hint="3日窗口" />
        <MetricCard label="参与排名" value={`${rankings.length}`} hint="服务商数量" />
        <MetricCard label="评分维度" value="价格/稳定/口碑" hint="可配置" />
      </section>
      <section className="mt-4">
        <Panel title="服务商排行榜">
          <SimpleTable headers={["排名", "服务商", "综合分", "3日可用率", "平均评分"]} rows={rows} />
        </Panel>
      </section>
    </SiteShell>
  );
}
