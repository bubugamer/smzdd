export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { SiteShell } from "@/components/layout/site-shell";
import { MetricCard, Panel, SimpleTable } from "@/components/ui/blocks";
import { getModelProviders, listPriceHistory } from "@/lib/server/data";

export default async function ModelDetailPage({ params }: { params: { id: string } }) {
  const data = await getModelProviders(params.id);
  if (!data) {
    notFound();
  }

  const priceHistory = await listPriceHistory({ modelId: data.model.id, days: 30, page: 1, pageSize: 20 });

  const minPrice = data.providers
    .map((item) => item.inputPricePerMillion)
    .filter((item): item is number => item !== null)
    .sort((a, b) => a - b)[0];

  const bestUptime = data.providers
    .map((item) => item.uptime3d)
    .sort((a, b) => b - a)[0] ?? 100;

  const matrixRows = data.providers.map((item) => [
    item.provider.name,
    `${item.uptime3d}%`,
    item.inputPricePerMillion !== null ? `${item.inputPricePerMillion}` : "-",
    item.outputPricePerMillion !== null ? `${item.outputPricePerMillion}` : "-",
    item.currency,
  ]);

  const historyRows = priceHistory.items.map((item) => [
    item.recordedAt.replace("T", " ").slice(0, 16),
    item.provider.name,
    item.model.displayName,
    `${item.inputPricePerMillion ?? "-"}/${item.outputPricePerMillion ?? "-"} ${item.currency}`,
  ]);

  return (
    <SiteShell title={`模型对比: ${data.model.displayName}`} description="同一模型在不同服务商的价格与稳定性对比。">
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="最低输入价" value={minPrice !== undefined ? `${minPrice}` : "-"} hint="基于当前数据" />
        <MetricCard label="最高可用率" value={`${bestUptime}%`} hint="3日窗口" />
        <MetricCard label="样本服务商" value={`${data.providers.length}`} hint="实时统计" />
      </section>
      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="服务商价格矩阵">
          <SimpleTable headers={["服务商", "3日可用率", "输入价", "输出价", "币种"]} rows={matrixRows} />
        </Panel>
        <Panel title="价格历史（最近30天）">
          <SimpleTable headers={["时间", "服务商", "模型", "价格"]} rows={historyRows} />
        </Panel>
      </section>
    </SiteShell>
  );
}
