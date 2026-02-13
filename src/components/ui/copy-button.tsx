"use client";

import { useState } from "react";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:border-gray-400"
      onClick={handleCopy}
      type="button"
    >
      {copied ? "已复制" : "复制地址"}
    </button>
  );
}
