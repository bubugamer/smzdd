"use client";

import { FormEvent, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";

type Provider = { id: string; name: string };
type ProbeItem = {
  id: string;
  provider: { id: string; name: string; slug: string };
  probeType: string;
  probeMethod: string;
  isSuccessful: boolean;
  responseTime: number | null;
  statusCode: number | null;
  errorMessage: string | null;
  probedAt: string;
};

export default function AdminProbesPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providerId, setProviderId] = useState("");
  const [items, setItems] = useState<ProbeItem[]>([]);
  const [days, setDays] = useState(7);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [manual, setManual] = useState({
    providerId: "",
    probeType: "API_CALL",
    isSuccessful: true,
    responseTime: "250",
    statusCode: "200",
    errorMessage: "",
  });

  async function loadProviders() {
    const res = await fetch("/api/providers?page=1&pageSize=200", { cache: "no-store" });
    const json = await res.json();
    if (res.ok) {
      setProviders(json.data.items.map((item: { id: string; name: string }) => ({ id: item.id, name: item.name })));
    }
  }

  async function loadProbes(nextPage = page) {
    const params = new URLSearchParams({
      page: String(nextPage),
      pageSize: "20",
      days: String(days),
    });
    if (providerId) params.set("providerId", providerId);
    const res = await fetch(`/api/probes?${params.toString()}`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) {
      setError(json.message ?? "加载失败");
      return;
    }
    setItems(json.data.items);
    setPage(json.data.page);
    setTotalPages(json.data.totalPages);
  }

  useEffect(() => {
    void Promise.all([loadProviders(), loadProbes(1)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createManualProbe(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!manual.providerId) {
      setError("请选择服务商");
      return;
    }

    const res = await fetch("/api/probes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerId: manual.providerId,
        probeType: manual.probeType,
        probeMethod: "MANUAL",
        isSuccessful: manual.isSuccessful,
        responseTime: Number(manual.responseTime),
        statusCode: Number(manual.statusCode),
        errorMessage: manual.errorMessage || undefined,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(`写入失败: ${json.message}`);
      return;
    }
    setMessage("手动探针写入成功");
    await loadProbes(1);
  }

  async function runProbeBatch() {
    setError("");
    setMessage("");
    const res = await fetch("/api/admin/jobs/probes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "once", providerIds: providerId ? [providerId] : undefined }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.message ?? "执行失败");
      return;
    }
    if (json.data.queueEnabled) {
      setMessage(`已入队 ${json.data.queued} 个探针任务`);
    } else {
      setMessage(`队列未启用，已直接生成 ${json.data.fallbackCreated} 条探针记录`);
      await loadProbes(1);
    }
  }

  return (
    <AdminShell title="探针管理" description="手动探针、批量探针任务、筛选与分页。">
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 grid gap-2 md:grid-cols-4">
          <select className="rounded border border-gray-300 px-2 py-1 text-sm md:col-span-2" value={providerId} onChange={(e) => setProviderId(e.target.value)}>
            <option value="">全部服务商</option>
            {providers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <input className="rounded border border-gray-300 px-2 py-1 text-sm" type="number" min={1} max={30} value={days} onChange={(e) => setDays(Number(e.target.value || 7))} />
          <button className="rounded border border-gray-300 px-3 py-1 text-sm" onClick={() => void loadProbes(1)}>筛选</button>
        </div>
        <div className="flex gap-2">
          <button className="rounded border border-red-200 bg-red-50 px-3 py-1 text-sm text-[#e23b3b]" onClick={() => void runProbeBatch()}>执行批量探针</button>
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">手动写入探针</h2>
        <form className="grid gap-2 md:grid-cols-6" onSubmit={createManualProbe}>
          <select className="rounded border border-gray-300 px-2 py-1 text-sm md:col-span-2" value={manual.providerId} onChange={(e) => setManual((v) => ({ ...v, providerId: e.target.value }))}>
            <option value="">选择服务商</option>
            {providers.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <select className="rounded border border-gray-300 px-2 py-1 text-sm" value={manual.probeType} onChange={(e) => setManual((v) => ({ ...v, probeType: e.target.value }))}>
            <option value="HEALTH_CHECK">HEALTH_CHECK</option>
            <option value="MODEL_LIST">MODEL_LIST</option>
            <option value="API_CALL">API_CALL</option>
            <option value="PRICING_CHECK">PRICING_CHECK</option>
          </select>
          <select className="rounded border border-gray-300 px-2 py-1 text-sm" value={manual.isSuccessful ? "true" : "false"} onChange={(e) => setManual((v) => ({ ...v, isSuccessful: e.target.value === "true" }))}>
            <option value="true">成功</option>
            <option value="false">失败</option>
          </select>
          <input className="rounded border border-gray-300 px-2 py-1 text-sm" placeholder="response(ms)" value={manual.responseTime} onChange={(e) => setManual((v) => ({ ...v, responseTime: e.target.value }))} />
          <input className="rounded border border-gray-300 px-2 py-1 text-sm" placeholder="statusCode" value={manual.statusCode} onChange={(e) => setManual((v) => ({ ...v, statusCode: e.target.value }))} />
          <input className="rounded border border-gray-300 px-2 py-1 text-sm md:col-span-5" placeholder="errorMessage (可选)" value={manual.errorMessage} onChange={(e) => setManual((v) => ({ ...v, errorMessage: e.target.value }))} />
          <button className="rounded border border-gray-300 px-3 py-1 text-sm" type="submit">写入</button>
        </form>
        {message ? <p className="mt-2 text-xs text-green-700">{message}</p> : null}
        {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      </section>

      <section className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">探针记录</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs text-gray-500">
              <tr>
                <th className="py-2">时间</th>
                <th>Provider</th>
                <th>Type</th>
                <th>Method</th>
                <th>Success</th>
                <th>Response</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-gray-100">
                  <td className="py-2">{new Date(item.probedAt).toLocaleString()}</td>
                  <td>{item.provider.name}</td>
                  <td>{item.probeType}</td>
                  <td>{item.probeMethod}</td>
                  <td>{item.isSuccessful ? "true" : "false"}</td>
                  <td>{item.responseTime ?? "-"}</td>
                  <td>{item.statusCode ?? "-"}</td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td className="py-4 text-xs text-gray-500" colSpan={7}>暂无数据</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
          <div>第 {page}/{totalPages} 页</div>
          <div className="flex gap-2">
            <button className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => void loadProbes(page - 1)}>上一页</button>
            <button className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40" disabled={page >= totalPages} onClick={() => void loadProbes(page + 1)}>下一页</button>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
