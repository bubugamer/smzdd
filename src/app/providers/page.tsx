export const dynamic = "force-dynamic";

import Link from "next/link";
import { SiteShell } from "@/components/layout/site-shell";
import { Panel, SimpleTable } from "@/components/ui/blocks";
import { listProviders } from "@/lib/server/data";

export default async function ProvidersPage() {
  const providers = await listProviders({ page: 1, pageSize: 50 });

  const rows = providers.items.map((item) => [
    item.name,
    `${item.compositeScore}`,
    `${item.uptime3d}%`,
    item.samplePricing ? `${item.samplePricing.inputPricePerMillion}/${item.samplePricing.outputPricePerMillion} ${item.samplePricing.currency}` : "-",
    item.status,
  ]);

  return (
    <SiteShell title="服务商列表" description="按评分、可用率和价格筛选服务商。">
      <Panel
        title="筛选与排序"
        action={<span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-[#e23b3b]">排序: 综合评分（预留）</span>}
      >
        <div className="text-sm text-gray-600">当前共 {providers.total} 家服务商（分页能力已就绪，筛选参数接口已支持）。</div>
      </Panel>
      <div className="mt-4">
        <Panel title="服务商数据">
          <SimpleTable headers={["服务商", "综合分", "3日可用率", "样例价格", "状态"]} rows={rows} />
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {providers.items.map((item) => (
              <Link key={item.id} className="rounded-full border border-gray-200 px-3 py-1 text-gray-700 hover:border-red-200 hover:bg-red-50 hover:text-[#e23b3b]" href={`/providers/${item.slug}`}>
                查看 {item.name}
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </SiteShell>
  );
}
