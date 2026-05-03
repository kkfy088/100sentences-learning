"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  modules,
  getSentencesByModule,
  getModuleInfo,
  getAllSentencesSync,
} from "@/lib/data";
import {
  Sentence,
  SentenceProgress,
  ScoringResult,
  StudyPhase,
  DiffResult,
} from "@/lib/types";
import {
  scoreTranslation,
  getAccuracyColor,
  getAccuracyLabel,
  circledNum,
} from "@/lib/scoring";

const STORAGE_KEY = "100sentences_v2_progress";

function renderDiffText(diff: DiffResult[]): React.ReactNode[] {
  return diff.map((d, i) => {
    switch (d.type) {
      case "correct":
        return (
          <span key={i} className="text-green-600 mr-1">
            {d.word}
          </span>
        );
      case "wrong":
        return (
          <span key={i} className="mr-1">
            <span className="text-red-500 line-through">{d.word}</span>
            <span className="text-red-500 ml-0.5">{d.correctWord}</span>
          </span>
        );
      case "missing":
        return (
          <span key={i} className="text-red-500 mr-1 underline decoration-dotted">
            {d.word}
          </span>
        );
      case "extra":
        return (
          <span key={i} className="text-red-400 line-through mr-1">
            {d.word}
          </span>
        );
      default:
        return null;
    }
  });
}

function loadProgress(): Record<string, SentenceProgress> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveProgress(progress: Record<string, SentenceProgress>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function StudyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const moduleParam = searchParams.get("module");
  const reviewParam = searchParams.get("review");

  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState<Record<string, SentenceProgress>>({});
  const [userInput, setUserInput] = useState("");
  const [phase, setPhase] = useState<StudyPhase>("translating");
  const [currentScore, setCurrentScore] = useState<ScoringResult | null>(null);
  const [attemptCount, setAttemptCount] = useState(1);
  const [showReview, setShowReview] = useState(!!reviewParam);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  useEffect(() => {
    setShowReview(!!reviewParam);
  }, [reviewParam]);

  useEffect(() => {
    if (moduleParam && modules.includes(moduleParam as typeof modules[number])) {
      setSentences(getSentencesByModule(moduleParam as typeof modules[number]));
    } else {
      setSentences(getAllSentencesSync());
    }
    resetForNewSentence();
  }, [moduleParam]);

  const currentSentence = sentences[currentIndex] || null;
  const moduleInfo = currentSentence ? getModuleInfo(currentSentence.module) : null;
  const totalInModule = sentences.length;
  const currentProgress: SentenceProgress | undefined = currentSentence
    ? progress[currentSentence.id]
    : undefined;
  const currentAttempts = currentProgress?.attempts || [];
  const maxAttemptsReached = currentAttempts.length >= 3;

  const reviewSentences = Object.values(progress).filter(
    (p) => p.passed && p.inReview
  );

  const resetForNewSentence = useCallback(() => {
    setUserInput("");
    setPhase("translating");
    setCurrentScore(null);
    setAttemptCount(1);
  }, []);

  useEffect(() => {
    if (currentSentence && currentProgress) {
      setAttemptCount(currentProgress.attempts.length + 1);
      if (currentProgress.passed && phase === "translating") {
        setPhase("passed");
      } else if (currentProgress.attempts.length >= 3 && !currentProgress.passed) {
        setPhase("maxed_out");
      }
    }
  }, [currentSentence, currentProgress, phase]);

  const handleSubmit = useCallback(() => {
    if (!userInput.trim() || !currentSentence) return;

    const result = scoreTranslation(userInput, currentSentence.targetSentence);

    const newAttempts = [
      ...currentAttempts,
      {
        input: userInput.trim(),
        accuracy: result.accuracy,
        passed: result.passed,
        timestamp: new Date().toISOString(),
      },
    ];

    const bestAccuracy = Math.max(
      currentProgress?.bestAccuracy || 0,
      result.accuracy
    );

    const updated: SentenceProgress = {
      sentenceId: currentSentence.id,
      attempts: newAttempts,
      totalAttempts: newAttempts.length,
      bestAccuracy,
      passed: currentProgress?.passed || result.passed,
      inReview: currentProgress?.inReview ?? result.passed,
    };

    const newProgress = { ...progress, [currentSentence.id]: updated };
    setProgress(newProgress);
    saveProgress(newProgress);
    setCurrentScore(result);
    setAttemptCount(newAttempts.length + 1);

    if (result.passed) {
      setPhase("passed");
    } else if (newAttempts.length >= 3) {
      setPhase("maxed_out");
    }
  }, [userInput, currentSentence, currentAttempts, currentProgress, progress]);

  const handleNextSentence = useCallback(() => {
    if (currentIndex < totalInModule - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setCurrentIndex(0);
    }
    resetForNewSentence();
  }, [currentIndex, totalInModule, resetForNewSentence]);

  const handleSelectModule = (mod: string) => {
    router.push(`/study?module=${encodeURIComponent(mod)}`);
    resetForNewSentence();
  };

  const handleToggleReview = () => {
    setShowReview(!showReview);
    router.push(showReview ? "/study" : "/study?review=1");
  };

  const handleRemoveReview = (sid: string) => {
    const updated = { ...progress };
    if (updated[sid]) {
      updated[sid] = { ...updated[sid], inReview: false };
      setProgress(updated);
      saveProgress(updated);
    }
  };

  const currentAccuracyColor =
    currentScore && currentProgress
      ? getAccuracyColor(currentScore.accuracy, currentScore.passed)
      : "#1e293b";

  if (!currentSentence) {
    return <div className="text-center py-16 text-slate-500">加载中...</div>;
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-primary">学习闯关</h1>
          {moduleInfo && (
            <p className="text-sm text-slate-500 mt-1">
              {moduleInfo.icon} {moduleInfo.title}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleReview}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              showReview
                ? "bg-primary text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            📋 复习菜单 ({reviewSentences.length})
          </button>
          <span className="text-sm text-slate-500">
            {currentIndex + 1} / {totalInModule}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full progress-bar"
          style={{ width: `${((currentIndex + 1) / totalInModule) * 100}%` }}
        />
      </div>

      {/* Module tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {modules.map((mod) => {
          const info = getModuleInfo(mod);
          const isActive = moduleParam === mod;
          return (
            <button
              key={mod}
              onClick={() => handleSelectModule(mod)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isActive
                  ? "bg-primary text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {info.icon} {mod}
            </button>
          );
        })}
      </div>

      {/* Review Menu Panel */}
      {showReview && (
        <div className="bg-white rounded-xl card-shadow p-5 space-y-3 fade-in">
          <h2 className="font-semibold text-lg">
            📋 复习菜单 ({reviewSentences.length})
          </h2>
          {reviewSentences.length === 0 ? (
            <p className="text-sm text-slate-400">
              暂无待复习句子。学习并成功通过句子后，它们将自动出现在这里。
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {reviewSentences.map((rp) => {
                const s = sentences.find((x) => x.id === rp.sentenceId);
                if (!s) return null;
                return (
                  <div
                    key={rp.sentenceId}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {s.chineseContext}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {s.targetSentence}
                      </p>
                      <p className="text-xs mt-1">
                        正确率 {rp.bestAccuracy}% · 尝试 {rp.totalAttempts} 次
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveReview(rp.sentenceId)}
                      className="ml-3 text-xs text-slate-400 hover:text-red-500 transition-colors shrink-0"
                    >
                      移除
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white rounded-xl card-shadow p-6 space-y-5">
        {/* Sentence ID + Circled attempt count */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-slate-400">
            {currentSentence.id}
          </span>
          <span className="text-sm" style={{ color: currentAccuracyColor }}>
            {circledNum(attemptCount)}
          </span>
          {currentProgress?.passed && (
            <span className="text-xs text-green-500 font-medium">✓ 已通过</span>
          )}
          {currentProgress && !currentProgress.passed && currentProgress.attempts.length >= 3 && (
            <span className="text-xs text-amber-500 font-medium">
              ⚠ 已达上限，待复习
            </span>
          )}
        </div>

        {/* Chinese context */}
        <div className="bg-blue-50 text-blue-800 p-4 rounded-lg">
          <p className="text-sm text-blue-500 mb-1">中文语境</p>
          <p className="text-lg font-medium">{currentSentence.chineseContext}</p>
        </div>

        {/* Input area (only when still attempting) */}
        {phase === "translating" && !maxAttemptsReached && !currentProgress?.passed && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                请输入英文翻译（第 {Math.min(attemptCount, 3)} 次尝试，最多 3 次）
              </label>
              <textarea
                className="w-full border-2 border-slate-200 rounded-lg p-4 text-base focus:border-primary focus:outline-none resize-none"
                rows={3}
                placeholder="输入你的英文翻译..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                autoFocus
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={!userInput.trim()}
              className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-primary-light disabled:bg-slate-300 transition-colors"
            >
              提交诊断
            </button>
          </>
        )}

        {/* Input history display */}
        {currentAttempts.length > 0 && (
          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-600 mb-3">
              ── 翻译记录 ──
            </h3>
            <div className="space-y-3">
              {currentAttempts.map((att, i) => {
                const color = getAccuracyColor(att.accuracy, att.passed);
                const label = getAccuracyLabel(att.accuracy, att.passed);
                const scoreResult =
                  i === currentAttempts.length - 1
                    ? currentScore
                    : scoreTranslation(att.input, currentSentence.targetSentence);

                return (
                  <div key={i} className="space-y-1">
                    <p className="text-sm" style={{ color }}>
                      第{circledNum(i + 1)}次: {att.input}
                      <span className="ml-2 text-xs">
                        [正确率 {att.accuracy}%] {label}
                      </span>
                    </p>
                    {/* Diff highlights for non-perfect attempts */}
                    {att.accuracy < 100 && scoreResult && (
                      <div className="text-xs ml-6">
                        <span className="text-red-500 font-medium mr-1">
                          错/漏:
                        </span>
                        {renderDiffText(
                          scoreResult.diff.filter((d) => d.type !== "correct")
                        )}
                      </div>
                    )}
                    {/* Tier1 warning for passed sentences */}
                    {att.passed && att.accuracy < 90 && currentSentence.tier1Warning && (
                      <p className="text-xs text-amber-600 ml-6">
                        💡 可升级: 避免使用「{currentSentence.tier1Warning}」
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Standard answer + deep analysis (after attempts) */}
        {(phase === "passed" || phase === "maxed_out" || currentProgress?.passed) && (
          <div className="border-t border-slate-200 pt-4 space-y-3 fade-in">
            {/* Standard answer */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h3 className="font-semibold text-slate-700 mb-1">标准答案</h3>
              <p className="text-lg font-medium text-primary">
                {currentSentence.targetSentence}
              </p>
            </div>

            {/* Deep analysis */}
            {currentSentence.deepAnalysis && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-1">深度解析</h3>
                <p className="text-blue-700 text-sm whitespace-pre-wrap">
                  {currentSentence.deepAnalysis}
                </p>
              </div>
            )}

            {/* Tier1 warning */}
            {currentSentence.tier1Warning && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-semibold text-amber-700 mb-1">词汇升级提示</h3>
                <p className="text-amber-600 text-sm">
                  日常写作中请尝试用高阶表达替换：
                  <span className="line-through mx-1">{currentSentence.tier1Warning}</span>
                </p>
              </div>
            )}

            {/* Best record */}
            {currentProgress && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-1">
                  最佳成绩
                </h3>
                <p className="text-green-700 text-sm">
                  最高正确率: {currentProgress.bestAccuracy}% ·
                  共尝试 {currentProgress.totalAttempts} 次
                  {currentProgress.passed
                    ? " · 已加入复习菜单"
                    : " · 待复习"}
                </p>
              </div>
            )}

            {/* Next button */}
            <button
              onClick={handleNextSentence}
              className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-primary-light transition-colors"
            >
              {currentIndex < totalInModule - 1 ? "下一句" : "返回开头"}
            </button>
          </div>
        )}

        {/* Already passed - just show review + next */}
        {currentProgress?.passed && phase === "translating" && (
          <div className="border-t border-slate-200 pt-4 space-y-3 fade-in">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-green-700 font-bold">✅ 你已通过此句！</p>
              <p className="text-green-600 text-sm mt-1">
                最佳正确率: {currentProgress.bestAccuracy}% ·
                尝试 {currentProgress.totalAttempts} 次
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h3 className="font-semibold text-slate-700 mb-1">标准答案</h3>
              <p className="text-lg font-medium text-primary">
                {currentSentence.targetSentence}
              </p>
            </div>
            <button
              onClick={handleNextSentence}
              className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-primary-light transition-colors"
            >
              {currentIndex < totalInModule - 1 ? "下一句" : "返回开头"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudyPage() {
  return (
    <Suspense fallback={<div className="text-center py-16">加载中...</div>}>
      <StudyContent />
    </Suspense>
  );
}
