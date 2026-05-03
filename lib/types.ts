/**
 * 类型定义 — 所有核心数据模型
 *
 * 本文件定义了项目中使用的全部 TypeScript 类型，
 * 包括学习模块、句子数据、进度记录和评分结果等。
 */

/** 五大学习模块名称 */
export type SentenceModule =
  | "核心动词升维"
  | "精准形容词与副词替换"
  | "高级逻辑连接词与过渡网络"
  | "学术论证与思辨框架"
  | "复杂句法多样性与长难句搭建";

/** 单条句子数据（来自语料库） */
export interface Sentence {
  id: string;              // 唯一标识，如 m1-01
  module: SentenceModule;  // 所属模块
  chineseContext: string;  // 中文语境/翻译提示
  targetSentence: string;  // 标准英文答案
  tier1Warning: string;    // 学生容易误用的基础词汇
  deepAnalysis: string;    // 语言点深度解析
}

/** 单次尝试记录 */
export interface AttemptRecord {
  input: string;      // 学生输入的原文
  accuracy: number;   // 本次正确率 (0-100)
  passed: boolean;    // 本次是否通过 (>50%)
  timestamp: string;  // 提交时间 ISO 字符串
}

/** 单个句子的完整学习进度 */
export interface SentenceProgress {
  sentenceId: string;        // 对应的句子 ID
  attempts: AttemptRecord[]; // 历史尝试记录列表
  totalAttempts: number;     // 累计尝试次数
  bestAccuracy: number;      // 历史最高正确率
  passed: boolean;           // 是否已通过
  inReview: boolean;         // 是否在复习菜单中
}

/** 逐词比对结果 — 描述学生输入与标准答案的一个词的差异 */
export interface DiffResult {
  type: "correct" | "wrong" | "missing" | "extra";
  // correct: 匹配正确  wrong: 用错词  missing: 缺少该词  extra: 多余词
  word: string;             // 词本身
  correctWord?: string;     // 正确词（仅在 wrong 类型时有值）
  index: number;            // 在句子中的位置索引
}

/** 一次评分的完整结果 */
export interface ScoringResult {
  accuracy: number;         // 最终正确率 (0-100)
  passed: boolean;          // 是否通过 (>50%)
  diff: DiffResult[];       // 逐词比对详情
  normalizedInput: string;  // 规范化后的学生输入
  normalizedTarget: string; // 规范化后的标准答案
  spellingErrors: number;   // 检测到的拼写错误数
  message: string;          // 结果提示信息
}

/** 学习阶段状态 */
export type StudyPhase = "translating" | "passed" | "maxed_out" | "reviewing";
// translating: 正在输入翻译  passed: 已通过  maxed_out: 3次未通过已达上限  reviewing: 复习中

/** AI 反馈（LLM 模式下的返回结构，当前版本已弃用但保留接口兼容） */
export interface AIFeedback {
  grammarCorrection: string;
  collocationsAnalysis: string;
  errorTags: string[];
  encouragement: string;
  overallScore: number;
}
