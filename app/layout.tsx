import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "高分100句 - 英文写作进阶工具",
  description: "通过学习和掌握100个高分英语句子来提升英语写作水平",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/" className="text-lg font-bold text-primary tracking-tight">
              高分100句
            </a>
            <nav className="flex items-center gap-6 text-sm font-medium">
              <a href="/" className="text-slate-600 hover:text-primary transition-colors">
                首页
              </a>
              <a href="/study" className="text-slate-600 hover:text-primary transition-colors">
                学习
              </a>
              <a href="/dictation" className="text-slate-600 hover:text-primary transition-colors">
                听写
              </a>
              <a href="/dashboard" className="text-slate-600 hover:text-primary transition-colors">
                进度
              </a>
            </nav>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
