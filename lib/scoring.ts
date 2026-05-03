import { DiffResult, ScoringResult } from "./types";

export const CIRCLED_NUMS = ["①", "②", "③"];

export function circledNum(attempt: number): string {
  return CIRCLED_NUMS[Math.min(attempt, 3) - 1] || "①";
}

export function scoreTranslation(
  studentInput: string,
  targetSentence: string,
  tolerance: { spellingTolerance: number } = { spellingTolerance: 1 }
): ScoringResult {
  const normalizedInput = normalizeText(studentInput);
  const normalizedTarget = normalizeText(targetSentence);

  const inputWords = tokenize(normalizedInput);
  const targetWords = tokenize(normalizedTarget);

  const diff = computeDiff(inputWords, targetWords);
  const spellingErrors = countSpellingErrors(diff);

  const matchedWords = diff.filter((d) => d.type === "correct").length;
  const accuracy = targetWords.length > 0
    ? Math.round((matchedWords / targetWords.length) * 100)
    : 0;

  const overSpellingPenalty = Math.max(0, spellingErrors - tolerance.spellingTolerance) * 5;
  const finalAccuracy = Math.max(0, accuracy - overSpellingPenalty);

  const passed = finalAccuracy > 50;

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

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[，。！？、；：""''（）【】《》\u3000]/g, " ")
    .replace(/[,.!?;:'"()\[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  return text.split(/\s+/).filter((w) => w.length > 0);
}

function computeDiff(inputWords: string[], targetWords: string[]): DiffResult[] {
  const results: DiffResult[] = [];
  const maxLen = Math.max(inputWords.length, targetWords.length);

  for (let i = 0; i < maxLen; i++) {
    const iw = inputWords[i];
    const tw = targetWords[i];

    if (!iw && tw) {
      results.push({ type: "missing", word: tw, index: i });
    } else if (iw && !tw) {
      results.push({ type: "extra", word: iw, index: i });
    } else if (iw && tw && iw === tw) {
      results.push({ type: "correct", word: tw, index: i });
    } else if (iw && tw) {
      results.push({ type: "wrong", word: iw, correctWord: tw, index: i });
    }
  }

  return results;
}

function countSpellingErrors(diff: DiffResult[]): number {
  return diff.filter((d) => {
    if (d.type !== "wrong") return false;
    const input = d.word;
    const correct = d.correctWord || "";
    if (input.length === correct.length) {
      let diffCount = 0;
      for (let i = 0; i < input.length; i++) {
        if (input[i] !== correct[i]) diffCount++;
      }
      return diffCount <= 2;
    }
    return Math.abs(input.length - correct.length) <= 1;
  }).length;
}

export function getAccuracyColor(accuracy: number, passed: boolean): string {
  if (accuracy >= 90) return "#1e293b";
  if (passed) return "#64748b";
  return "#94a3b8";
}

export function getAccuracyLabel(accuracy: number, passed: boolean): string {
  if (accuracy >= 90) return "⭐ 优秀";
  if (passed) return "✅ 通过";
  return "❌ 未通过";
}
