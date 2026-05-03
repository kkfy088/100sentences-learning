/**
 * 数据访问层 — 句子数据和学习进度管理
 *
 * 双模式运行：
 * 1. Supabase 云数据库模式（配置后自动使用）
 * 2. 本地 JSON 模式（默认，从 sentences.json 加载）
 *
 * 提供句子查询、学习记录读写、复习调度等功能。
 */

import { Sentence } from "./types";
import { supabase, isSupabaseConfigured } from "./supabase";
import sentencesData from "./sentences.json";

/** 从本地 JSON 加载的 100 句核心语料 */
const localSentences: Sentence[] = sentencesData as Sentence[];

/**
 * 获取所有句子（异步版本）
 * 如果 Supabase 已配置则从云端加载，否则使用本地数据
 */
export async function getAllSentences(): Promise<Sentence[]> {
  if (supabase && isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from("sentences")
      .select("*")
      .order("id");
    if (!error && data) return data as Sentence[];
  }
  return localSentences;
}

/** 获取所有句子（同步版本，直接返回本地数据） */
export function getAllSentencesSync(): Sentence[] {
  return localSentences;
}

/** 按模块筛选句子 */
export function getSentencesByModule(module: Sentence["module"]): Sentence[] {
  return localSentences.filter((s) => s.module === module);
}

/** 按 ID 查找单条句子 */
export function getSentenceById(id: string): Sentence | undefined {
  return localSentences.find((s) => s.id === id);
}

/** 全部 5 个模块名称列表 */
export const modules: Sentence["module"][] = [
  "核心动词升维",
  "精准形容词与副词替换",
  "高级逻辑连接词与过渡网络",
  "学术论证与思辨框架",
  "复杂句法多样性与长难句搭建",
];

/** 获取模块的展示信息（名称、描述、图标） */
export function getModuleInfo(module: Sentence["module"]) {
  const infos: Record<Sentence["module"], { title: string; description: string; icon: string }> = {
    "核心动词升维": {
      title: "核心动词升维",
      description: "摒弃基础动词（如 make, do, show），使用如 illustrate, convey, evaluate 等高阶动词",
      icon: "📘",
    },
    "精准形容词与副词替换": {
      title: "精准形容词与副词替换",
      description: "告别 very bad 或 very big，掌握 detrimental, immense, profound 等增强修辞张力的词汇",
      icon: "📗",
    },
    "高级逻辑连接词与过渡网络": {
      title: "高级逻辑连接词与过渡网络",
      description: "建立形合直觉。超越简单的 and, but, so，学习使用 conversely, nevertheless, subsequently",
      icon: "📙",
    },
    "学术论证与思辨框架": {
      title: "学术论证与思辨框架",
      description: "掌握 Claim（主张）、Evidence（证据）和 Reasoning（推理）的句型支架",
      icon: "📕",
    },
    "复杂句法多样性与长难句搭建": {
      title: "复杂句法多样性与长难句搭建",
      description: "满足考纲对句法多样性的要求，学习前置分词状语、同位语、倒装句等高阶结构",
      icon: "📓",
    },
  };
  return infos[module];
}

// ──────────────────────────────────────
// 以下为 Supabase 云端数据操作方法
// 仅在配置了 Supabase 环境变量时生效
// ──────────────────────────────────────

/** 获取某用户对某句子的学习记录 */
export async function getStudyRecord(userId: string, sentenceId: string) {
  if (!supabase) return null;
  const { data } = await supabase
    .from("study_records")
    .select("*")
    .eq("user_id", userId)
    .eq("sentence_id", sentenceId)
    .single();
  return data;
}

/** 写入或更新学习记录（upsert = 存在则更新，不存在则插入） */
export async function upsertStudyRecord(
  userId: string,
  sentenceId: string,
  record: {
    repetitionCount: number;
    easeFactor: number;
    intervalDays: number;
    nextReviewDate: string;
    inputHistory: string[];
    errorTags: string[];
    dictationUnlocked: boolean;
  }
) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("study_records")
    .upsert(
      {
        user_id: userId,
        sentence_id: sentenceId,
        repetition_count: record.repetitionCount,
        ease_factor: record.easeFactor,
        interval_days: record.intervalDays,
        next_review_date: record.nextReviewDate,
        input_history: record.inputHistory,
        error_tags: record.errorTags,
        dictation_unlocked: record.dictationUnlocked,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,sentence_id" }
    );
  return { data, error };
}

/** 获取到期需要复习的句子 ID 列表（基于 SRS 调度） */
export async function getDueReviewSentences(userId: string): Promise<string[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("study_records")
    .select("sentence_id")
    .eq("user_id", userId)
    .lte("next_review_date", new Date().toISOString())  // next_review_date ≤ 今天
    .order("next_review_date", { ascending: true });
  return data ? data.map((r: { sentence_id: string }) => r.sentence_id) : [];
}
