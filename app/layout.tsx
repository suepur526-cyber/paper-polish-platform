import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "论文润色平台",
  description: "论文结构审阅、格式保护和学术润色工具"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
