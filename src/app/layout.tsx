import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SMZDD - 什么值得调",
  description: "AI API中转服务对比平台",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
