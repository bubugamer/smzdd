export const dynamic = "force-dynamic";

import { SiteShell } from "@/components/layout/site-shell";
import { MetricCard, Panel, SimpleTable } from "@/components/ui/blocks";
import { getLatencySummary, getUptimeSummary, listProbes } from "@/lib/server/data";

export default async function MonitoringPage() {
  const [uptime, latency, probes] = await Promise.all([
    getUptimeSummary(3),
    getLatencySummary(3),
    listProbes({ days: 3, page: 1, pageSize: 20 }),
  ]);

  const avgUptime =
    uptime.items.length > 0
      ? Number((uptime.items.reduce((sum, item) => sum + item.uptime, 0) / uptime.items.length).toFixed(2))
      : 100;

  const avgLatency =
    latency.items
      .map((item) => item.avgResponseTime)
      .filter((item): item is number => item !== null)
      .reduce((sum, item, _, arr) => sum + item / arr.length, 0) || 0;

  const failCount = probes.items.filter((item) => !item.isSuccessful).length;

  const probeRows = probes.items.map((item) => [
    item.provider.name,
    item.probeType,
    item.isSuccessful ? "成功" : "失败",
    item.responseTime !== null ? `${item.responseTime}ms` : "-",
    item.probedAt.replace("T", " ").slice(0, 16),
  ]);

  return (
    <SiteShell title="监控大盘" description="按探针结果追踪服务商可用率、响应时间和异常。">
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="整体可用率" value={`${avgUptime}%`} hint="近3天" />
        <MetricCard label="平均响应" value={`${avgLatency.toFixed(0)}ms`} hint="近3天" />
        <MetricCard label="失败探针" value={`${failCount}`} hint={`总样本 ${probes.total}`} />
        <MetricCard label="监控服务商" value={`${uptime.items.length}`} hint="实时统计" />
      </section>
      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="成功率趋势图占位">
          <div className="h-52 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
            下一步接时序图：成功率 + 响应延迟
          </div>
        </Panel>
        <Panel title="探针记录（最近20条）">
          <SimpleTable headers={["服务商", "探针", "状态", "响应", "时间"]} rows={probeRows} />
        </Panel>
      </section>
    </SiteShell>
  );
}
