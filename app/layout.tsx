/**
 * 根布局 — 全局页面框架
 *
 * 定义 HTML 结构、全局导航栏和页面容器。
 * 所有子页面通过 {children} 渲染在 <main> 区域中。
 */

import type { Metadata } from "next";
import "./globals.css";

/** 页面元数据（浏览器标签页标题、SEO描述） */
export const metadata: Metadata = {
  title: "高分100句 - 英文写作进阶工具",
  description: "通过学习和掌握100个高分英语句子来提升英语写作水平",
};

/** 视口配置 — 确保移动端正确缩放（≥375px 视口宽度） */
export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-slate-50">
        {/* 顶部导航栏 — position: sticky 固定于页面顶部 */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
            {/* Logo/品牌名 */}
            <a href="/" className="text-lg font-bold text-primary tracking-tight">
              高分100句
            </a>
            {/* 导航链接 */}
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

        {/* 主内容区域 */}
        <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
