"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(`登录失败: ${json.message}`);
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f7f6] p-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6">
        <h1 className="text-xl font-bold text-[#e23b3b]">SMZDD Admin Login</h1>
        <p className="mt-1 text-sm text-gray-600">请输入管理员密码</p>

        <form className="mt-4 space-y-3" onSubmit={onSubmit}>
          <input
            type="password"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            disabled={loading}
            type="submit"
            className="w-full rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-[#e23b3b] disabled:opacity-50"
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>

        <p className="mt-3 text-xs text-gray-500">
          默认密码: <code>admin123</code>（可用环境变量 <code>ADMIN_PASSWORD</code> 覆盖）
        </p>
        {message ? <p className="mt-2 text-xs text-red-600">{message}</p> : null}
      </div>
    </main>
  );
}
