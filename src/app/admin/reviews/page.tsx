"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";

type Provider = { id: string; name: string };
type ReviewItem = {
  id: string;
  providerId: string;
  provider: { id: string; name: string; slug: string };
  rating: number;
  title: string | null;
  content: string;
  reviewerName: string | null;
  createdAt: string;
};

const pageSize = 10;

export default function AdminReviewsPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providerId, setProviderId] = useState("");
  const [minRating, setMinRating] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    providerId: "",
    rating: "5",
    title: "",
    content: "",
    reviewerName: "",
  });

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, value]) => value).map(([id]) => id),
    [selected],
  );

  async function loadProviders() {
    const res = await fetch("/api/providers?page=1&pageSize=200", { cache: "no-store" });
    const json = await res.json();
    if (res.ok) {
      setProviders(json.data.items.map((item: { id: string; name: string }) => ({ id: item.id, name: item.name })));
    }
  }

  async function loadReviews(nextPage = page) {
    const params = new URLSearchParams({
      page: String(nextPage),
      pageSize: String(pageSize),
    });
    if (providerId) params.set("providerId", providerId);
    if (minRating) params.set("minRating", minRating);

    const res = await fetch(`/api/reviews?${params.toString()}`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) {
      setError(json.message ?? "加载失败");
      return;
    }
    setItems(json.data.items);
    setPage(json.data.page);
    setTotalPages(json.data.totalPages);
    setSelected({});
  }

  useEffect(() => {
    void Promise.all([loadProviders(), loadReviews(1)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createReviewSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!form.providerId || !form.content.trim()) {
      setError("请填写服务商和评价内容");
      return;
    }
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerId: form.providerId,
        rating: Number(form.rating),
        title: form.title || undefined,
        content: form.content,
        reviewerName: form.reviewerName || undefined,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.message ?? "创建失败");
      return;
    }
    setMessage("评价创建成功");
    setForm({ providerId: "", rating: "5", title: "", content: "", reviewerName: "" });
    await loadReviews(1);
  }

  async function batchDelete() {
    if (selectedIds.length === 0) {
      setError("请先勾选数据");
      return;
    }
    if (!window.confirm(`确定删除 ${selectedIds.length} 条评价吗？`)) {
      return;
    }
    for (const id of selectedIds) {
      await fetch(`/api/reviews/${id}`, { method: "DELETE" });
    }
    setMessage(`已删除 ${selectedIds.length} 条评价`);
    await loadReviews(page);
  }

  return (
    <AdminShell title="评价管理" description="评价创建、筛选分页、批量删除。">
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">新增评价</h2>
        <form className="grid gap-2 md:grid-cols-5" onSubmit={createReviewSubmit}>
          <select className="rounded border border-gray-300 px-2 py-1 text-sm" value={form.providerId} onChange={(e) => setForm((v) => ({ ...v, providerId: e.target.value }))} required>
            <option value="">选择服务商</option>
            {providers.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <input className="rounded border border-gray-300 px-2 py-1 text-sm" type="number" min={1} max={5} value={form.rating} onChange={(e) => setForm((v) => ({ ...v, rating: e.target.value }))} required />
          <input className="rounded border border-gray-300 px-2 py-1 text-sm" placeholder="标题(可选)" value={form.title} onChange={(e) => setForm((v) => ({ ...v, title: e.target.value }))} />
          <input className="rounded border border-gray-300 px-2 py-1 text-sm" placeholder="评价人(可选)" value={form.reviewerName} onChange={(e) => setForm((v) => ({ ...v, reviewerName: e.target.value }))} />
          <button className="rounded border border-red-200 bg-red-50 px-3 py-1 text-sm text-[#e23b3b]" type="submit">创建</button>
          <textarea className="rounded border border-gray-300 px-2 py-1 text-sm md:col-span-5" placeholder="评价内容" rows={3} value={form.content} onChange={(e) => setForm((v) => ({ ...v, content: e.target.value }))} required />
        </form>
        {message ? <p className="mt-2 text-xs text-green-700">{message}</p> : null}
        {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      </section>

      <section className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 grid gap-2 md:grid-cols-4">
          <select className="rounded border border-gray-300 px-2 py-1 text-sm md:col-span-2" value={providerId} onChange={(e) => setProviderId(e.target.value)}>
            <option value="">全部服务商</option>
            {providers.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <input className="rounded border border-gray-300 px-2 py-1 text-sm" placeholder="最小评分" type="number" min={1} max={5} value={minRating} onChange={(e) => setMinRating(e.target.value)} />
          <button className="rounded border border-gray-300 px-3 py-1 text-sm" onClick={() => void loadReviews(1)}>筛选</button>
        </div>
        <div className="mb-3 flex items-center gap-2">
          <button className="rounded border border-red-200 bg-red-50 px-3 py-1 text-xs text-[#e23b3b]" onClick={() => void batchDelete()}>批量删除</button>
          <span className="text-xs text-gray-500">已选 {selectedIds.length} 条</span>
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
                <th>时间</th>
                <th>服务商</th>
                <th>评分</th>
                <th>标题</th>
                <th>评价内容</th>
                <th>评价人</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-gray-100">
                  <td className="py-2">
                    <input type="checkbox" checked={Boolean(selected[item.id])} onChange={(e) => setSelected((v) => ({ ...v, [item.id]: e.target.checked }))} />
                  </td>
                  <td>{new Date(item.createdAt).toLocaleString()}</td>
                  <td>{item.provider.name}</td>
                  <td>{item.rating}</td>
                  <td>{item.title ?? "-"}</td>
                  <td className="max-w-[400px] truncate">{item.content}</td>
                  <td>{item.reviewerName ?? "-"}</td>
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
            <button className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => void loadReviews(page - 1)}>上一页</button>
            <button className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40" disabled={page >= totalPages} onClick={() => void loadReviews(page + 1)}>下一页</button>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
