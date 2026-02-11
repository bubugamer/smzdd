import Link from "next/link";
import { ReactNode } from "react";

const navItems = [
  { href: "/admin", label: "后台首页" },
  { href: "/admin/providers", label: "服务商管理" },
  { href: "/admin/models", label: "模型管理" },
  { href: "/admin/pricing", label: "定价管理" },
  { href: "/admin/probes", label: "探针管理" },
  { href: "/admin/reviews", label: "评价管理" },
  { href: "/admin/settings", label: "系统设置" },
];

export function AdminShell({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8f7f6] text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div>
            <div className="text-lg font-bold text-[#e23b3b]">SMZDD Admin</div>
            <div className="text-xs text-gray-500">运营与数据管理控制台</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <nav className="flex flex-wrap items-center gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700 hover:border-red-200 hover:bg-red-50 hover:text-[#e23b3b]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <form method="post" action="/api/auth/logout">
              <button className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700 hover:border-red-200 hover:bg-red-50 hover:text-[#e23b3b]" type="submit">
                退出登录
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <section className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
          <h1 className="text-xl font-bold">{title}</h1>
          {description ? <p className="mt-1 text-sm text-gray-600">{description}</p> : null}
        </section>
        {children}
      </main>
    </div>
  );
}
