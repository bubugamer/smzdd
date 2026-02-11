"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";

type ProviderItem = {
  id: string;
  name: string;
  slug: string;
  website: string;
  status: string;
  compositeScore: number;
};

const pageSize = 10;

export default function AdminProvidersPage() {
  const [items, setItems] = useState<ProviderItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    slug: "",
    website: "",
    status: "ACTIVE",
  });

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, value]) => value).map(([id]) => id),
    [selected],
  );

  async function load(nextPage = page) {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      page: String(nextPage),
      pageSize: String(pageSize),
    });
    if (search.trim()) params.set("search", search.trim());
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/providers?${params.toString()}`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) {
      setError(json.message ?? "加载失败");
      setLoading(false);
      return;
    }
    setItems(json.data.items);
    setTotal(json.data.total);
    setPage(json.data.page);
    setSelected({});
    setLoading(false);
  }

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createProvider(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    const res = await fetch("/api/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(`创建失败: ${json.message}`);
      return;
    }
    setMessage("创建成功");
    setForm({ name: "", slug: "", website: "", status: "ACTIVE" });
    await load(1);
  }

  async function batchUpdateStatus(nextStatus: string) {
    if (selectedIds.length === 0) {
      setError("请先勾选数据");
      return;
    }
    setError("");
    for (const id of selectedIds) {
      await fetch(`/api/providers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
    }
    setMessage(`已批量更新 ${selectedIds.length} 项为 ${nextStatus}`);
    await load(page);
  }

  async function batchDelete() {
    if (selectedIds.length === 0) {
      setError("请先勾选数据");
      return;
    }
    if (!window.confirm(`确定删除 ${selectedIds.length} 条服务商记录吗？`)) {
      return;
    }
    for (const id of selectedIds) {
      await fetch(`/api/providers/${id}`, { method: "DELETE" });
    }
    setMessage(`已批量删除 ${selectedIds.length} 项`);
    await load(page);
  }

  function toggleSelectAll(checked: boolean) {
    const next: Record<string, boolean> = {};
    for (const item of items) next[item.id] = checked;
    setSelected(next);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AdminShell title="服务商管理" description="表单校验、分页筛选、批量更新状态与删除。">
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">新增服务商</h2>
        <form className="grid gap-2 md:grid-cols-5" onSubmit={createProvider}>
          <input className="rounded border border-gray-300 px-2 py-1 text-sm" placeholder="name" value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} required />
          <input className="rounded border border-gray-300 px-2 py-1 text-sm" placeholder="slug" value={form.slug} onChange={(e) => setForm((v) => ({ ...v, slug: e.target.value }))} pattern="[a-z0-9-]+" title="仅小写字母、数字、-" required />
          <input className="rounded border border-gray-300 px-2 py-1 text-sm md:col-span-2" placeholder="website" value={form.website} onChange={(e) => setForm((v) => ({ ...v, website: e.target.value }))} type="url" required />
          <select className="rounded border border-gray-300 px-2 py-1 text-sm" value={form.status} onChange={(e) => setForm((v) => ({ ...v, status: e.target.value }))}>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="TESTING">TESTING</option>
            <option value="DEPRECATED">DEPRECATED</option>
          </select>
          <button className="rounded border border-red-200 bg-red-50 px-3 py-1 text-sm text-[#e23b3b] md:col-span-5" type="submit">创建</button>
        </form>
        {message ? <p className="mt-2 text-xs text-green-700">{message}</p> : null}
        {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      </section>

      <section className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 grid gap-2 md:grid-cols-5">
          <input
            className="rounded border border-gray-300 px-2 py-1 text-sm md:col-span-2"
            placeholder="按名称/slug搜索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="rounded border border-gray-300 px-2 py-1 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">全部状态</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="TESTING">TESTING</option>
            <option value="DEPRECATED">DEPRECATED</option>
          </select>
          <button className="rounded border border-gray-300 px-3 py-1 text-sm" onClick={() => void load(1)}>筛选</button>
          <button className="rounded border border-gray-300 px-3 py-1 text-sm" onClick={() => void batchUpdateStatus("ACTIVE")}>批量设为 ACTIVE</button>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          <button className="rounded border border-gray-300 px-3 py-1 text-xs" onClick={() => void batchUpdateStatus("INACTIVE")}>
            批量设为 INACTIVE
          </button>
          <button className="rounded border border-red-200 bg-red-50 px-3 py-1 text-xs text-[#e23b3b]" onClick={() => void batchDelete()}>
            批量删除
          </button>
          <div className="text-xs text-gray-500">已选 {selectedIds.length} 项</div>
        </div>

        <h2 className="mb-3 text-sm font-semibold">服务商列表 {loading ? "(加载中...)" : ""}</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs text-gray-500">
              <tr>
                <th className="py-2">
                  <input type="checkbox" onChange={(e) => toggleSelectAll(e.target.checked)} checked={items.length > 0 && selectedIds.length === items.length} />
                </th>
                <th>Name</th>
                <th>Slug</th>
                <th>Status</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-gray-100">
                  <td className="py-2">
                    <input
                      type="checkbox"
                      checked={Boolean(selected[item.id])}
                      onChange={(e) => setSelected((v) => ({ ...v, [item.id]: e.target.checked }))}
                    />
                  </td>
                  <td>{item.name}</td>
                  <td>{item.slug}</td>
                  <td>{item.status}</td>
                  <td>{item.compositeScore}</td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td className="py-4 text-xs text-gray-500" colSpan={5}>
                    暂无数据
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
          <div>
            第 {page}/{totalPages} 页，共 {total} 条
          </div>
          <div className="flex gap-2">
            <button className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => void load(page - 1)}>
              上一页
            </button>
            <button className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40" disabled={page >= totalPages} onClick={() => void load(page + 1)}>
              下一页
            </button>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
