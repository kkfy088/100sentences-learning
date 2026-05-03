/**
 * Supabase 数据库客户端 — 可选模块
 *
 * 提供与 Supabase 云数据库的连接。
 * 如果未配置环境变量，自动退化为 null，项目使用本地 JSON 存储。
 *
 * 环境变量（在 .env.local 中配置）：
 *   NEXT_PUBLIC_SUPABASE_URL       — Supabase 项目 URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY  — Supabase 匿名公钥
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

/** 单例客户端实例（懒加载，避免重复创建） */
let supabaseClient: SupabaseClient | null = null;

/**
 * 获取 Supabase 客户端（懒初始化）
 *
 * 首次调用时检查环境变量是否有效，有效则创建客户端。
 * 如果 URL 或 key 为占位符值（your_supabase_xxx），视为未配置。
 */
function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;  // 已初始化，直接返回
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 未配置或为占位符值 → 返回 null
  if (!url || !key || url === "your_supabase_project_url" || key === "your_supabase_anon_key") {
    return null;
  }

  try {
    supabaseClient = createClient(url, key);
    return supabaseClient;
  } catch {
    // 创建失败（如 URL 格式无效）→ 返回 null，不影响本地模式运行
    return null;
  }
}

/** 全局 Supabase 客户端实例 */
export const supabase = getSupabaseClient();

/**
 * 检查 Supabase 是否已正确配置
 *
 * 返回 true 表示环境变量有效且可连接云端数据库，
 * 返回 false 表示将使用本地 JSON 数据存储。
 */
export const isSupabaseConfigured = (): boolean => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!(url && key && url !== "your_supabase_project_url" && key !== "your_supabase_anon_key");
};
