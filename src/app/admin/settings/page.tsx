"use client";

import { FormEvent, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";

type SettingsData = {
  scoringConfig: {
    version: string;
    formula: string;
    notes?: string;
    weights: {
      priceWeight: number;
      uptimeWeight: number;
      reviewWeight: number;
    };
  };
  adminSettings: {
    probeScheduler: {
      enabled: boolean;
      intervalMinutes: number;
      timeoutMs: number;
      maxJobsPerSweep: number;
    };
    sampleModel: string;
  };
  queue: {
    enabled: boolean;
    redisUrl: string | null;
    queues: string[];
  };
};

type ModelOption = {
  id: string;
  name: string;
  displayName: string;
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([]);
  const [queueJobs, setQueueJobs] = useState<Array<Record<string, unknown>>>([]);
  const [csvEntity, setCsvEntity] = useState("providers");
  const [csvText, setCsvText] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const [settingsRes, jobsRes, modelsRes] = await Promise.all([
      fetch("/api/settings", { cache: "no-store" }),
      fetch("/api/admin/jobs?queue=probe-check&state=waiting&limit=30", {
        cache: "no-store",
      }),
      fetch("/api/models?page=1&pageSize=200", { cache: "no-store" }),
    ]);
    const settingsJson = await settingsRes.json();
    const jobsJson = await jobsRes.json();
    const modelsJson = await modelsRes.json();
    if (settingsRes.ok) {
      setSettings(settingsJson.data);
    } else {
      setError(settingsJson.message ?? "配置加载失败");
    }
    if (jobsRes.ok) {
      setQueueJobs(jobsJson.data.items ?? []);
    }
    if (modelsRes.ok) {
      setModelOptions(modelsJson.data.items ?? []);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setError("");
    setMessage("");
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scoringConfig: settings.scoringConfig,
        adminSettings: settings.adminSettings,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.message ?? "保存失败");
      return;
    }
    setSettings(json.data);
    setMessage("配置保存成功，已实时生效");
  }

  async function updateScheduler(enabled: boolean) {
    if (!settings) return;
    const res = await fetch("/api/admin/jobs/probes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "schedule",
        enabled,
        intervalMinutes: settings.adminSettings.probeScheduler.intervalMinutes,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.message ?? "更新调度失败");
      return;
    }
    setMessage(`自动探针已${enabled ? "开启" : "关闭"}`);
    await load();
  }

  async function importCsv(dryRun: boolean) {
    setError("");
    setMessage("");
    const res = await fetch("/api/admin/import/csv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: csvEntity,
        csvText,
        dryRun,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.message ?? "导入失败");
      return;
    }
    setMessage(
      dryRun
        ? `预检完成: ${json.data.totalRows} 行`
        : `导入完成: imported=${json.data.imported}, skipped=${json.data.skipped}`,
    );
  }

  if (!settings) {
    return (
      <AdminShell title="系统设置" description="评分配置、任务调度、CSV 导入。">
        <section className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
          加载中...
        </section>
      </AdminShell>
    );
  }

  const weightSum =
    settings.scoringConfig.weights.priceWeight +
    settings.scoringConfig.weights.uptimeWeight +
    settings.scoringConfig.weights.reviewWeight;

  return (
    <AdminShell title="系统设置" description="评分权重实时生效、BullMQ 调度、CSV 导入链路。">
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">评分配置</h2>
        <form className="grid gap-2 md:grid-cols-4" onSubmit={saveSettings}>
          <input className="rounded border border-gray-300 px-2 py-1 text-sm" value={settings.scoringConfig.weights.priceWeight} type="number" step="0.01" onChange={(e) => setSettings((v) => v ? ({ ...v, scoringConfig: { ...v.scoringConfig, weights: { ...v.scoringConfig.weights, priceWeight: Number(e.target.value || 0) } } }) : v)} />
          <input className="rounded border border-gray-300 px-2 py-1 text-sm" value={settings.scoringConfig.weights.uptimeWeight} type="number" step="0.01" onChange={(e) => setSettings((v) => v ? ({ ...v, scoringConfig: { ...v.scoringConfig, weights: { ...v.scoringConfig.weights, uptimeWeight: Number(e.target.value || 0) } } }) : v)} />
          <input className="rounded border border-gray-300 px-2 py-1 text-sm" value={settings.scoringConfig.weights.reviewWeight} type="number" step="0.01" onChange={(e) => setSettings((v) => v ? ({ ...v, scoringConfig: { ...v.scoringConfig, weights: { ...v.scoringConfig.weights, reviewWeight: Number(e.target.value || 0) } } }) : v)} />
          <select className="rounded border border-gray-300 px-2 py-1 text-sm md:col-span-3" value={settings.adminSettings.sampleModel} onChange={(e) => setSettings((v) => v ? ({ ...v, adminSettings: { ...v.adminSettings, sampleModel: e.target.value } }) : v)}>
            {modelOptions.map((item) => (
              <option key={item.id} value={item.name}>
                {item.displayName} ({item.name})
              </option>
            ))}
            {(modelOptions.length === 0 || !modelOptions.some((item) => item.name === settings.adminSettings.sampleModel)) ? (
              <option value={settings.adminSettings.sampleModel}>{settings.adminSettings.sampleModel}</option>
            ) : null}
          </select>
          <button className="rounded border border-red-200 bg-red-50 px-3 py-1 text-sm text-[#e23b3b]" type="submit">保存评分配置</button>
        </form>
        <p className="mt-2 text-xs text-gray-600">权重合计: {weightSum.toFixed(2)}（必须为 1）</p>
        <p className="mt-1 text-xs text-gray-600">服务商列表页使用该“样例模型”计算样例价格，不支持前台手动输入。</p>
      </section>

      <section className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">自动探针调度（BullMQ）</h2>
        <div className="grid gap-2 md:grid-cols-4">
          <input className="rounded border border-gray-300 px-2 py-1 text-sm" type="number" min={5} max={1440} value={settings.adminSettings.probeScheduler.intervalMinutes} onChange={(e) => setSettings((v) => v ? ({ ...v, adminSettings: { ...v.adminSettings, probeScheduler: { ...v.adminSettings.probeScheduler, intervalMinutes: Number(e.target.value || 30) } } }) : v)} />
          <input className="rounded border border-gray-300 px-2 py-1 text-sm" type="number" min={1000} max={120000} value={settings.adminSettings.probeScheduler.timeoutMs} onChange={(e) => setSettings((v) => v ? ({ ...v, adminSettings: { ...v.adminSettings, probeScheduler: { ...v.adminSettings.probeScheduler, timeoutMs: Number(e.target.value || 8000) } } }) : v)} />
          <button className="rounded border border-gray-300 px-3 py-1 text-sm" onClick={() => void updateScheduler(true)}>开启调度</button>
          <button className="rounded border border-gray-300 px-3 py-1 text-sm" onClick={() => void updateScheduler(false)}>关闭调度</button>
        </div>
        <p className="mt-2 text-xs text-gray-600">
          队列状态: {settings.queue.enabled ? "已启用" : "未启用"} {settings.queue.redisUrl ? `(REDIS_URL=${settings.queue.redisUrl})` : ""}
        </p>
      </section>

      <section className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">CSV 导入</h2>
        <div className="grid gap-2 md:grid-cols-4">
          <select className="rounded border border-gray-300 px-2 py-1 text-sm" value={csvEntity} onChange={(e) => setCsvEntity(e.target.value)}>
            <option value="providers">providers</option>
            <option value="models">models</option>
            <option value="providerModels">providerModels</option>
          </select>
          <button className="rounded border border-gray-300 px-3 py-1 text-sm" onClick={() => void importCsv(true)}>预检</button>
          <button className="rounded border border-red-200 bg-red-50 px-3 py-1 text-sm text-[#e23b3b]" onClick={() => void importCsv(false)}>执行导入</button>
        </div>
        <textarea className="mt-2 w-full rounded border border-gray-300 px-2 py-1 text-sm" rows={8} placeholder="粘贴 CSV 内容（第一行是 header）" value={csvText} onChange={(e) => setCsvText(e.target.value)} />
      </section>

      <section className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">待执行任务（probe-check）</h2>
        <pre className="overflow-x-auto rounded border border-gray-200 bg-gray-50 p-3 text-xs">
          {JSON.stringify(queueJobs, null, 2)}
        </pre>
      </section>

      {message ? <p className="mt-3 text-xs text-green-700">{message}</p> : null}
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </AdminShell>
  );
}
