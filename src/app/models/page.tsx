export const dynamic = "force-dynamic";

import Link from "next/link";
import { SiteShell } from "@/components/layout/site-shell";
import { Panel, SimpleTable } from "@/components/ui/blocks";
import { listModels } from "@/lib/server/data";

export default async function ModelsPage() {
  const models = await listModels({ page: 1, pageSize: 50 });
  const rows = models.items.map((item) => [
    item.displayName,
    item.family,
    `${item.providerCount}`,
    item.minInputPrice ? `${item.minInputPrice.value} ${item.minInputPrice.currency}` : "-",
  ]);

  return (
    <SiteShell title="模型列表" description="查看模型家族、支持服务商数量和最低价格。">
      <Panel title="模型目录">
        <SimpleTable headers={["模型", "Family", "支持服务商", "最低输入价"]} rows={rows} />
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {models.items.map((item) => (
            <Link
              key={item.id}
              className="rounded-full border border-gray-200 px-3 py-1 text-gray-700 hover:border-red-200 hover:bg-red-50 hover:text-[#e23b3b]"
              href={`/models/${item.name}`}
            >
              查看 {item.displayName}
            </Link>
          ))}
        </div>
      </Panel>
    </SiteShell>
  );
}
