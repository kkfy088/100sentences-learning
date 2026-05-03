import { Sentence } from "./types";
import { supabase, isSupabaseConfigured } from "./supabase";
import sentencesData from "./sentences.json";

const localSentences: Sentence[] = sentencesData as Sentence[];

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

export function getAllSentencesSync(): Sentence[] {
  return localSentences;
}

export function getSentencesByModule(module: Sentence["module"]): Sentence[] {
  return localSentences.filter((s) => s.module === module);
}

export function getSentenceById(id: string): Sentence | undefined {
  return localSentences.find((s) => s.id === id);
}

export const modules: Sentence["module"][] = [
  "核心动词升维",
  "精准形容词与副词替换",
  "高级逻辑连接词与过渡网络",
  "学术论证与思辨框架",
  "复杂句法多样性与长难句搭建",
];

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

export async function getDueReviewSentences(userId: string): Promise<string[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("study_records")
    .select("sentence_id")
    .eq("user_id", userId)
    .lte("next_review_date", new Date().toISOString())
    .order("next_review_date", { ascending: true });
  return data ? data.map((r: { sentence_id: string }) => r.sentence_id) : [];
}
