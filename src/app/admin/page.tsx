export const dynamic = "force-dynamic";

import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { MetricCard, Panel } from "@/components/ui/blocks";
import { getDashboardData, listModels, listProviders } from "@/lib/server/data";

export default async function AdminHomePage() {
  const [dashboard, providers, models] = await Promise.all([
    getDashboardData(),
    listProviders({ page: 1, pageSize: 1 }),
    listModels({ page: 1, pageSize: 1 }),
  ]);

  return (
    <AdminShell title="后台首页" description="查看当前数据规模，进入各管理模块。">
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="服务商" value={`${providers.total}`} hint="可编辑" />
        <MetricCard label="模型" value={`${models.total}`} hint="可编辑" />
        <MetricCard label="3日平台可用率" value={`${dashboard.stats.platformUptime3d}%`} hint="探针汇总" />
        <MetricCard label="24h 调价" value={`${dashboard.stats.priceChangeCount24h}`} hint="历史记录" />
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-3">
        <Panel title="服务商管理">
          <p className="text-sm text-gray-600">新增供应商、修改状态和官网信息。</p>
          <Link href="/admin/providers" className="mt-3 inline-block rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm text-[#e23b3b]">
            进入服务商管理
          </Link>
        </Panel>
        <Panel title="模型管理">
          <p className="text-sm text-gray-600">维护模型字典、上下文长度、弃用状态。</p>
          <Link href="/admin/models" className="mt-3 inline-block rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm text-[#e23b3b]">
            进入模型管理
          </Link>
        </Panel>
        <Panel title="定价管理">
          <p className="text-sm text-gray-600">按 provider-model 调整价格并写入价格历史。</p>
          <Link href="/admin/pricing" className="mt-3 inline-block rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm text-[#e23b3b]">
            进入定价管理
          </Link>
        </Panel>
        <Panel title="探针管理">
          <p className="text-sm text-gray-600">手动写入探针、触发批量探针任务。</p>
          <Link href="/admin/probes" className="mt-3 inline-block rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm text-[#e23b3b]">
            进入探针管理
          </Link>
        </Panel>
        <Panel title="评价管理">
          <p className="text-sm text-gray-600">管理用户评价，支持筛选和批量删除。</p>
          <Link href="/admin/reviews" className="mt-3 inline-block rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm text-[#e23b3b]">
            进入评价管理
          </Link>
        </Panel>
        <Panel title="系统设置">
          <p className="text-sm text-gray-600">评分权重配置、任务调度、CSV 导入。</p>
          <Link href="/admin/settings" className="mt-3 inline-block rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm text-[#e23b3b]">
            进入系统设置
          </Link>
        </Panel>
      </section>
    </AdminShell>
  );
}
