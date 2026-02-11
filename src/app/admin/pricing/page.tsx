"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";

type ProviderModelItem = {
  id: string;
  provider: { id: string; name: string; slug: string };
  model: { id: string; displayName: string };
  inputPricePerMillion: number | null;
  outputPricePerMillion: number | null;
  currency: string;
  isAvailable: boolean;
};

const pageSize = 10;

export default function AdminPricingPage() {
  const [items, setItems] = useState<ProviderModelItem[]>([]);
  const [providerOptions, setProviderOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [providerId, setProviderId] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [providerModelId, setProviderModelId] = useState("");
  const [inputPrice, setInputPrice] = useState("");
  const [outputPrice, setOutputPrice] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, value]) => value).map(([id]) => id),
    [selected],
  );

  async function load(nextPage = page) {
    const params = new URLSearchParams({
      page: String(nextPage),
      pageSize: String(pageSize),
    });
    if (providerId) params.set("providerId", providerId);
    const res = await fetch(`/api/provider-models?${params.toString()}`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) {
      setError(json.message ?? "加载失败");
      return;
    }
    setItems(json.data.items);
    setTotal(json.data.total);
    setPage(json.data.page);
    setSelected({});
  }

  async function loadProviders() {
    const res = await fetch("/api/providers?page=1&pageSize=200", { cache: "no-store" });
    const json = await res.json();
    if (res.ok) {
      setProviderOptions(json.data.items.map((item: { id: string; name: string }) => ({ id: item.id, name: item.name })));
    }
  }

  useEffect(() => {
    void Promise.all([load(1), loadProviders()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitPriceUpdate(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!providerModelId) {
      setError("请选择 provider-model");
      return;
    }

    const body: Record<string, unknown> = {};
    if (inputPrice.length > 0) body.inputPricePerMillion = Number(inputPrice);
    if (outputPrice.length > 0) body.outputPricePerMillion = Number(outputPrice);
    if (Object.keys(body).length === 0) {
      setError("至少输入一个价格字段");
      return;
    }

    const res = await fetch(`/api/provider-models/${providerModelId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(`更新失败: ${json.message}`);
      return;
    }

    setMessage("价格更新成功，PriceHistory 已自动记录");
    setInputPrice("");
    setOutputPrice("");
    await load(page);
  }

  async function batchAvailability(isAvailable: boolean) {
    if (selectedIds.length === 0) {
      setError("请先勾选记录");
      return;
    }
    for (const id of selectedIds) {
      await fetch(`/api/provider-models/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable }),
      });
    }
    setMessage(`已批量更新 ${selectedIds.length} 项可用性`);
    await load(page);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AdminShell title="定价管理" description="价格维护、分页筛选、批量可用性切换。">
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">更新价格</h2>
        <form className="grid gap-2 md:grid-cols-3" onSubmit={submitPriceUpdate}>
          <select className="rounded border border-gray-300 px-2 py-1 text-sm md:col-span-3" value={providerModelId} onChange={(e) => setProviderModelId(e.target.value)}>
            <option value="">请选择 provider-model</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.provider.name} / {item.model.displayName} ({item.id})
              </option>
            ))}
          </select>
          <input className="rounded border border-gray-300 px-2 py-1 text-sm" placeholder="inputPricePerMillion" value={inputPrice} onChange={(e) => setInputPrice(e.target.value)} />
          <input className="rounded border border-gray-300 px-2 py-1 text-sm" placeholder="outputPricePerMillion" value={outputPrice} onChange={(e) => setOutputPrice(e.target.value)} />
          <button className="rounded border border-red-200 bg-red-50 px-3 py-1 text-sm text-[#e23b3b]" type="submit">提交更新</button>
        </form>
        {message ? <p className="mt-2 text-xs text-green-700">{message}</p> : null}
        {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      </section>

      <section className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 grid gap-2 md:grid-cols-4">
          <select className="rounded border border-gray-300 px-2 py-1 text-sm md:col-span-2" value={providerId} onChange={(e) => setProviderId(e.target.value)}>
            <option value="">全部服务商</option>
            {providerOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <button className="rounded border border-gray-300 px-3 py-1 text-sm" onClick={() => void load(1)}>筛选</button>
          <button className="rounded border border-gray-300 px-3 py-1 text-sm" onClick={() => setProviderId("")}>清空筛选</button>
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          <button className="rounded border border-gray-300 px-3 py-1 text-xs" onClick={() => void batchAvailability(true)}>批量设为可用</button>
          <button className="rounded border border-gray-300 px-3 py-1 text-xs" onClick={() => void batchAvailability(false)}>批量设为不可用</button>
          <span className="text-xs text-gray-500">已选 {selectedIds.length} 项</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs text-gray-500">
              <tr>
                <th className="py-2">
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selectedIds.length === items.length}
                    onChange={(e) => {
                      const next: Record<string, boolean> = {};
                      for (const item of items) next[item.id] = e.target.checked;
                      setSelected(next);
                    }}
                  />
                </th>
                <th>Provider</th>
                <th>Model</th>
                <th>Input</th>
                <th>Output</th>
                <th>Currency</th>
                <th>Available</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-gray-100">
                  <td className="py-2">
                    <input type="checkbox" checked={Boolean(selected[item.id])} onChange={(e) => setSelected((v) => ({ ...v, [item.id]: e.target.checked }))} />
                  </td>
                  <td>{item.provider.name}</td>
                  <td>{item.model.displayName}</td>
                  <td>{item.inputPricePerMillion ?? "-"}</td>
                  <td>{item.outputPricePerMillion ?? "-"}</td>
                  <td>{item.currency}</td>
                  <td>{item.isAvailable ? "true" : "false"}</td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td className="py-4 text-xs text-gray-500" colSpan={7}>
                    暂无数据
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
          <div>第 {page}/{totalPages} 页，共 {total} 条</div>
          <div className="flex gap-2">
            <button className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => void load(page - 1)}>上一页</button>
            <button className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40" disabled={page >= totalPages} onClick={() => void load(page + 1)}>下一页</button>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
