export type SentenceModule =
  | "核心动词升维"
  | "精准形容词与副词替换"
  | "高级逻辑连接词与过渡网络"
  | "学术论证与思辨框架"
  | "复杂句法多样性与长难句搭建";

export interface Sentence {
  id: string;
  module: SentenceModule;
  chineseContext: string;
  targetSentence: string;
  tier1Warning: string;
  deepAnalysis: string;
}

export interface StudyRecord {
  sentenceId: string;
  repetitionCount: number;
  easeFactor: number;
  intervalDays: number;
  nextReviewDate: string;
  inputHistory: string[];
  errorTags: string[];
  learnedAt?: string;
  dictationUnlocked: boolean;
}

export interface UserProgress {
  studyRecords: Record<string, StudyRecord>;
  lastStudiedAt?: string;
}

export type CardState =
  | "TRANSLATE_FIRST"
  | "AI_REVIEW"
  | "PERFECT_REWRITE"
  | "REWRITE_FEEDBACK"
  | "COMPLETED";

export type DictationState =
  | "READY"
  | "LISTENING"
  | "INPUT"
  | "CHECKING"
  | "RESULT";

export interface AIFeedback {
  grammarCorrection: string;
  collocationsAnalysis: string;
  errorTags: string[];
  encouragement: string;
  overallScore: number;
}

export interface GeneratedTask {
  id: string;
  targetKnowledge: string;
  generatedChinese: string;
  targetSentenceHint: string;
}
