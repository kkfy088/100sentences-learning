/**
 * 评分引擎 — 翻译比对和正确率计算
 *
 * 核心功能：将学生的翻译输入与标准答案进行逐词比对，
 * 计算正确率并生成颜色标识。
 *
 * 容忍规则：空格差异、标点差异、大小写差异不扣分，
 * 最多容忍 1 个拼写错误，超过部分每个扣 5%。
 */

import { DiffResult, ScoringResult } from "./types";

/** 带圈数字 ①②③，用于标识尝试次数 */
export const CIRCLED_NUMS = ["①", "②", "③"];

/** 根据尝试次数返回对应的带圈数字 */
export function circledNum(attempt: number): string {
  return CIRCLED_NUMS[Math.min(attempt, 3) - 1] || "①";
}

/**
 * 核心评分函数 — 比对学生的翻译与标准答案
 *
 * @param studentInput    学生输入的英文翻译
 * @param targetSentence  标准答案
 * @param tolerance       容忍配置，默认容忍 1 个拼写错误
 * @returns ScoringResult 包含正确率、是否通过、逐词Diff和提示信息
 */
export function scoreTranslation(
  studentInput: string,
  targetSentence: string,
  tolerance: { spellingTolerance: number } = { spellingTolerance: 1 }
): ScoringResult {
  // 步骤1: 规范化文本（去标点、小写化、合并空格）
  const normalizedInput = normalizeText(studentInput);
  const normalizedTarget = normalizeText(targetSentence);

  // 步骤2: 分词
  const inputWords = tokenize(normalizedInput);
  const targetWords = tokenize(normalizedTarget);

  // 步骤3: 逐词比对，生成 Diff 结果
  const diff = computeDiff(inputWords, targetWords);

  // 步骤4: 统计拼写错误数
  const spellingErrors = countSpellingErrors(diff);

  // 步骤5: 计算基础正确率 = 正确匹配的词数 / 标准答案总词数
  const matchedWords = diff.filter((d) => d.type === "correct").length;
  const accuracy = targetWords.length > 0
    ? Math.round((matchedWords / targetWords.length) * 100)
    : 0;

  // 步骤6: 超出容忍范围的拼写错误扣分（每个5%）
  const overSpellingPenalty = Math.max(0, spellingErrors - tolerance.spellingTolerance) * 5;
  const finalAccuracy = Math.max(0, accuracy - overSpellingPenalty);

  // 步骤7: 判定是否通过（正确率 > 50%）
  const passed = finalAccuracy > 50;

  // 步骤8: 生成提示信息
  let message = "";
  if (passed && finalAccuracy >= 90) {
    message = "⭐ 优秀！正确率超过90%，已完美掌握。";
  } else if (passed) {
    message = "✅ 通过！继续加油，争取更高正确率。";
  } else if (spellingErrors > tolerance.spellingTolerance) {
    message = `拼写错误 ${spellingErrors} 处（容忍 ${tolerance.spellingTolerance} 处），请检查拼写。`;
  } else {
    message = "请仔细对比标准答案，纠正语法和词汇错误。";
  }

  return {
    accuracy: finalAccuracy,
    passed,
    diff,
    normalizedInput,
    normalizedTarget,
    spellingErrors,
    message,
  };
}

/**
 * 文本规范化 — 移除标点、转小写、合并空格
 * 
 * 中英文双栏标点：逗号、句号、分号、引号、括号等，
 * 全部替换为空格以实现统一的分词基线。
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    // 中文标点 → 空格
    .replace(/[，。！？、；：""''（）【】《》\u3000]/g, " ")
    // 英文标点 → 空格
    .replace(/[,.!?;:'"()\[\]{}]/g, " ")
    // 合并多余空格
    .replace(/\s+/g, " ")
    .trim();
}

/** 分词 — 按空格拆分，过滤空串 */
function tokenize(text: string): string[] {
  return text.split(/\s+/).filter((w) => w.length > 0);
}

/**
 * 逐词比对 — 将学生输入的词列表与标准答案词列表逐一比较
 *
 * 返回四种 Diff 类型：
 * - correct: 位置和词都正确
 * - wrong:   位置对但词不对（错误替换）
 * - missing: 标准答案有但学生输入缺失的词
 * - extra:   学生多出的词
 */
function computeDiff(inputWords: string[], targetWords: string[]): DiffResult[] {
  const results: DiffResult[] = [];
  const maxLen = Math.max(inputWords.length, targetWords.length);

  for (let i = 0; i < maxLen; i++) {
    const iw = inputWords[i];  // 学生输入中的第 i 个词
    const tw = targetWords[i]; // 标准答案中的第 i 个词

    if (!iw && tw) {
      // 学生缺失该词
      results.push({ type: "missing", word: tw, index: i });
    } else if (iw && !tw) {
      // 学生多出的词
      results.push({ type: "extra", word: iw, index: i });
    } else if (iw && tw && iw === tw) {
      // 完全匹配
      results.push({ type: "correct", word: tw, index: i });
    } else if (iw && tw) {
      // 位置对但词不对
      results.push({ type: "wrong", word: iw, correctWord: tw, index: i });
    }
  }

  return results;
}

/**
 * 拼写错误计数 — 识别可能的拼写错误（区别于完全用错词）
 *
 * 判断标准：
 * - 两个词长度相同时，字母差异 ≤ 2 个 → 拼写错误
 * - 两个词长度差 ≤ 1 且内容相似 → 拼写错误
 * - 其余情况 → 用错词（如 shows vs illustrates），不算拼写错误
 */
function countSpellingErrors(diff: DiffResult[]): number {
  return diff.filter((d) => {
    if (d.type !== "wrong") return false;
    const input = d.word;
    const correct = d.correctWord || "";
    // 长度相同：检查字母级别差异数
    if (input.length === correct.length) {
      let diffCount = 0;
      for (let i = 0; i < input.length; i++) {
        if (input[i] !== correct[i]) diffCount++;
      }
      return diffCount <= 2;
    }
    // 长度接近：差 1 以内视作拼写错误
    return Math.abs(input.length - correct.length) <= 1;
  }).length;
}

/**
 * 获取正确率对应的颜色
 *
 * ≥90% → 黑色（优秀）
 * 已通过 → 深灰
 * 未通过 → 浅灰
 */
export function getAccuracyColor(accuracy: number, passed: boolean): string {
  if (accuracy >= 90) return "#1e293b"; // 黑色 — 优秀
  if (passed) return "#64748b";        // 深灰 — 已通过
  return "#94a3b8";                    // 浅灰 — 未通过
}

/** 获取正确率对应的标签文本 */
export function getAccuracyLabel(accuracy: number, passed: boolean): string {
  if (accuracy >= 90) return "⭐ 优秀";
  if (passed) return "✅ 通过";
  return "❌ 未通过";
}
