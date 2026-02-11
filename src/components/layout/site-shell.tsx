import Link from "next/link";
import { ReactNode } from "react";

const navItems = [
  { href: "/", label: "总览" },
  { href: "/providers", label: "服务商" },
  { href: "/models", label: "模型" },
  { href: "/rankings", label: "排行榜" },
  { href: "/price-trends", label: "价格趋势" },
  { href: "/monitoring", label: "监控" },
];

export function SiteShell({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8f7f6] text-gray-900">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <div>
            <Link href="/" className="text-lg font-bold text-[#e23b3b]">
              SMZDD
            </Link>
            <p className="text-xs text-gray-500">AI API中转服务对比平台</p>
          </div>
          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-600 transition hover:border-red-200 hover:bg-red-50 hover:text-[#e23b3b]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 md:p-5">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description ? <p className="mt-2 text-sm text-gray-600">{description}</p> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
