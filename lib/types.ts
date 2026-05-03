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

export interface AttemptRecord {
  input: string;
  accuracy: number;
  passed: boolean;
  timestamp: string;
}

export interface SentenceProgress {
  sentenceId: string;
  attempts: AttemptRecord[];
  totalAttempts: number;
  bestAccuracy: number;
  passed: boolean;
  inReview: boolean;
}

export interface DiffResult {
  type: "correct" | "wrong" | "missing" | "extra";
  word: string;
  correctWord?: string;
  index: number;
}

export interface ScoringResult {
  accuracy: number;
  passed: boolean;
  diff: DiffResult[];
  normalizedInput: string;
  normalizedTarget: string;
  spellingErrors: number;
  message: string;
}

export type StudyPhase = "translating" | "passed" | "maxed_out" | "reviewing";

export interface AIFeedback {
  grammarCorrection: string;
  collocationsAnalysis: string;
  errorTags: string[];
  encouragement: string;
  overallScore: number;
}
