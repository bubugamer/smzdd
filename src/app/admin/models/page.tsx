"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";

type ModelItem = {
  id: string;
  name: string;
  displayName: string;
  family: string;
  provider: string;
  deprecated: boolean;
  providerCount: number;
};

const pageSize = 10;

export default function AdminModelsPage() {
  const [items, setItems] = useState<ModelItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [familyFilter, setFamilyFilter] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    displayName: "",
    family: "",
    provider: "",
  });

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, value]) => value).map(([id]) => id),
    [selected],
  );

  async function load(nextPage = page) {
    const params = new URLSearchParams({
      page: String(nextPage),
      pageSize: String(pageSize),
    });
    if (search.trim()) params.set("search", search.trim());
    if (familyFilter.trim()) params.set("family", familyFilter.trim());

    const res = await fetch(`/api/models?${params.toString()}`, { cache: "no-store" });
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

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createModelSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    const res = await fetch("/api/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, modality: ["text"] }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(`创建失败: ${json.message}`);
      return;
    }

    setMessage("模型创建成功");
    setForm({ name: "", displayName: "", family: "", provider: "" });
    await load(1);
  }

  async function toggleDeprecated(id: string, nextDeprecated: boolean) {
    const res = await fetch(`/api/models/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deprecated: nextDeprecated }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(`更新失败: ${json.message}`);
      return;
    }
    setMessage("更新成功");
    await load(page);
  }

  async function batchDeprecated(nextDeprecated: boolean) {
    if (selectedIds.length === 0) {
      setError("请先勾选数据");
      return;
    }
    for (const id of selectedIds) {
      await fetch(`/api/models/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deprecated: nextDeprecated }),
      });
    }
    setMessage(`已批量更新 ${selectedIds.length} 条`);
    await load(page);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AdminShell title="模型管理" description="支持模型创建、筛选分页、批量弃用。">
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">新增模型</h2>
        <form className="grid gap-2 md:grid-cols-4" onSubmit={createModelSubmit}>
          <input className="rounded border border-gray-300 px-2 py-1 text-sm" placeholder="name" value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} required />
          <input className="rounded border border-gray-300 px-2 py-1 text-sm" placeholder="displayName" value={form.displayName} onChange={(e) => setForm((v) => ({ ...v, displayName: e.target.value }))} required />
          <input className="rounded border border-gray-300 px-2 py-1 text-sm" placeholder="family" value={form.family} onChange={(e) => setForm((v) => ({ ...v, family: e.target.value }))} required />
          <input className="rounded border border-gray-300 px-2 py-1 text-sm" placeholder="provider" value={form.provider} onChange={(e) => setForm((v) => ({ ...v, provider: e.target.value }))} required />
          <button className="rounded border border-red-200 bg-red-50 px-3 py-1 text-sm text-[#e23b3b] md:col-span-4" type="submit">创建</button>
        </form>
        {message ? <p className="mt-2 text-xs text-green-700">{message}</p> : null}
        {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      </section>

      <section className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 grid gap-2 md:grid-cols-4">
          <input className="rounded border border-gray-300 px-2 py-1 text-sm md:col-span-2" placeholder="按名称搜索" value={search} onChange={(e) => setSearch(e.target.value)} />
          <input className="rounded border border-gray-300 px-2 py-1 text-sm" placeholder="family筛选" value={familyFilter} onChange={(e) => setFamilyFilter(e.target.value)} />
          <button className="rounded border border-gray-300 px-3 py-1 text-sm" onClick={() => void load(1)}>筛选</button>
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          <button className="rounded border border-gray-300 px-3 py-1 text-xs" onClick={() => void batchDeprecated(true)}>批量弃用</button>
          <button className="rounded border border-gray-300 px-3 py-1 text-xs" onClick={() => void batchDeprecated(false)}>批量取消弃用</button>
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
                <th>Display Name</th>
                <th>Name</th>
                <th>Family</th>
                <th>Provider</th>
                <th>Deprecated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-gray-100">
                  <td className="py-2">
                    <input type="checkbox" checked={Boolean(selected[item.id])} onChange={(e) => setSelected((v) => ({ ...v, [item.id]: e.target.checked }))} />
                  </td>
                  <td>{item.displayName}</td>
                  <td>{item.name}</td>
                  <td>{item.family}</td>
                  <td>{item.provider}</td>
                  <td>{item.deprecated ? "true" : "false"}</td>
                  <td>
                    <button className="rounded border border-gray-300 px-2 py-1 text-xs" onClick={() => void toggleDeprecated(item.id, !item.deprecated)}>
                      切换
                    </button>
                  </td>
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
