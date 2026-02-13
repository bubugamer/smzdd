"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function ReviewSubmitForm({ providerId }: { providerId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId,
          rating,
          title: title.trim() || undefined,
          content: content.trim(),
          reviewerName: reviewerName.trim() || undefined,
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json.message ?? "提交失败，请稍后重试");
        return;
      }
      setMessage("提交成功，感谢你的评价。");
      setTitle("");
      setContent("");
      setReviewerName("");
      router.refresh();
    } catch {
      setError("网络异常，提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="mt-3 grid gap-2 rounded border border-gray-200 bg-gray-50 p-3" onSubmit={onSubmit}>
      <div className="text-xs text-gray-600">匿名可提交：昵称可留空。</div>
      <div className="grid gap-2 md:grid-cols-3">
        <input
          className="rounded border border-gray-300 px-2 py-1 text-sm"
          maxLength={80}
          onChange={(e) => setReviewerName(e.target.value)}
          placeholder="昵称（可选）"
          value={reviewerName}
        />
        <select
          className="rounded border border-gray-300 px-2 py-1 text-sm"
          onChange={(e) => setRating(Number(e.target.value))}
          value={rating}
        >
          <option value={5}>5 分</option>
          <option value={4}>4 分</option>
          <option value={3}>3 分</option>
          <option value={2}>2 分</option>
          <option value={1}>1 分</option>
        </select>
        <input
          className="rounded border border-gray-300 px-2 py-1 text-sm"
          maxLength={120}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="标题（可选）"
          value={title}
        />
      </div>
      <textarea
        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
        maxLength={5000}
        onChange={(e) => setContent(e.target.value)}
        placeholder="请填写你的使用体验（必填）"
        required
        rows={4}
        value={content}
      />
      <div className="flex items-center justify-between">
        <button
          className="rounded border border-red-200 bg-red-50 px-3 py-1 text-sm text-[#e23b3b] disabled:opacity-50"
          disabled={submitting}
          type="submit"
        >
          {submitting ? "提交中..." : "提交评价"}
        </button>
        {message ? <span className="text-xs text-green-700">{message}</span> : null}
        {error ? <span className="text-xs text-red-600">{error}</span> : null}
      </div>
    </form>
  );
}
