/**
 * 学习页面 — 核心交互模块
 *
 * 实现「最多三次尝试→标准答案比对判定→输入历史保留」学习闭环。
 *
 * 核心流程：
 * 1. 用户看到中文语境，输入英文翻译 → 提交
 * 2. 系统逐词比对标准答案，计算正确率
 * 3. >50% 通过 → 自动进入下一句 + 加入复习菜单
 * 4. ≤50% → 显示错误详情，可继续尝试（最多3次）
 * 5. 3次均未通过 → 标记待复习，自动进入下一句
 */

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

/** localStorage 存储键名 */
const STORAGE_KEY = "100sentences_v2_progress";

/**
 * 渲染逐词 Diff 结果 — 将评分引擎返回的差异列表转为带颜色的 JSX
 *
 * correct → 绿色  |  wrong → 红色删除线+正确词  |  missing → 红色下划线  |  extra → 红色删除线
 */
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

/** 从 localStorage 加载所有学习进度 */
function loadProgress(): Record<string, SentenceProgress> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

/** 将所有学习进度保存到 localStorage */
function saveProgress(progress: Record<string, SentenceProgress>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

/** 学习页面主组件（使用 Suspense 包裹以支持 useSearchParams） */
function StudyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const moduleParam = searchParams.get("module"); // URL参数：指定学习的模块
  const reviewParam = searchParams.get("review");  // URL参数：是否显示复习菜单

  // ─── 状态管理 ───
  const [sentences, setSentences] = useState<Sentence[]>([]);      // 当前模块的句子列表
  const [currentIndex, setCurrentIndex] = useState(0);              // 当前句子索引
  const [progress, setProgress] = useState<Record<string, SentenceProgress>>({}); // 全部学习进度
  const [userInput, setUserInput] = useState("");                   // 输入框内容
  const [phase, setPhase] = useState<StudyPhase>("translating");    // 当前学习阶段
  const [currentScore, setCurrentScore] = useState<ScoringResult | null>(null); // 最近一次评分结果
  const [attemptCount, setAttemptCount] = useState(1);              // 当前尝试次数（用于显示带圈数字）
  const [showReview, setShowReview] = useState(!!reviewParam);     // 是否展开复习菜单

  // 初始化：从 localStorage 加载进度
  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  // 监听 URL 参数变化，切换复习菜单显示
  useEffect(() => {
    setShowReview(!!reviewParam);
  }, [reviewParam]);

  // 监听模块变化，加载对应句子列表
  useEffect(() => {
    if (moduleParam && modules.includes(moduleParam as typeof modules[number])) {
      setSentences(getSentencesByModule(moduleParam as typeof modules[number]));
    } else {
      setSentences(getAllSentencesSync());
    }
    resetForNewSentence();
  }, [moduleParam]);

  // ─── 派生状态 ───
  const currentSentence = sentences[currentIndex] || null;          // 当前显示的句子
  const moduleInfo = currentSentence ? getModuleInfo(currentSentence.module) : null;
  const totalInModule = sentences.length;                            // 当前模块的总句子数
  const currentProgress: SentenceProgress | undefined = currentSentence
    ? progress[currentSentence.id]
    : undefined;                                                    // 当前句子的学习记录
  const currentAttempts = currentProgress?.attempts || [];          // 当前句子的历史尝试列表
  const maxAttemptsReached = currentAttempts.length >= 3;           // 是否已达3次上限

  // 复习菜单中的句子列表（已通过且未手动移除）
  const reviewSentences = Object.values(progress).filter(
    (p) => p.passed && p.inReview
  );

  /** 重置为新句子状态 */
  const resetForNewSentence = useCallback(() => {
    setUserInput("");
    setPhase("translating");
    setCurrentScore(null);
    setAttemptCount(1);
  }, []);

  // 根据已有进度自动设置尝试次数和阶段
  useEffect(() => {
    if (currentSentence && currentProgress) {
      setAttemptCount(currentProgress.attempts.length + 1);  // 带圈数字 = 历史次数 + 1
      if (currentProgress.passed && phase === "translating") {
        setPhase("passed");
      } else if (currentProgress.attempts.length >= 3 && !currentProgress.passed) {
        setPhase("maxed_out");  // 3次未通过
      }
    }
  }, [currentSentence, currentProgress, phase]);

  /**
   * 提交翻译 — 核心交互
   *
   * 1. 调用评分引擎比对标准答案
   * 2. 将本次尝试追加到历史记录
   * 3. 更新 localStorage
   * 4. 根据结果切换阶段
   */
  const handleSubmit = useCallback(() => {
    if (!userInput.trim() || !currentSentence) return;

    // 调用评分引擎
    const result = scoreTranslation(userInput, currentSentence.targetSentence);

    // 构建新的尝试记录列表
    const newAttempts = [
      ...currentAttempts,
      {
        input: userInput.trim(),
        accuracy: result.accuracy,
        passed: result.passed,
        timestamp: new Date().toISOString(),
      },
    ];

    // 更新最高正确率
    const bestAccuracy = Math.max(
      currentProgress?.bestAccuracy || 0,
      result.accuracy
    );

    // 构建更新后的句子进度
    const updated: SentenceProgress = {
      sentenceId: currentSentence.id,
      attempts: newAttempts,
      totalAttempts: newAttempts.length,
      bestAccuracy,
      passed: currentProgress?.passed || result.passed,  // 一旦通过就永久通过
      inReview: currentProgress?.inReview ?? result.passed,  // 通过即加入复习菜单
    };

    // 同步到 state 和 localStorage
    const newProgress = { ...progress, [currentSentence.id]: updated };
    setProgress(newProgress);
    saveProgress(newProgress);
    setCurrentScore(result);
    setAttemptCount(newAttempts.length + 1);

    // 阶段切换
    if (result.passed) {
      setPhase("passed");  // 通过 → 展示标准答案
    } else if (newAttempts.length >= 3) {
      setPhase("maxed_out");  // 3次未通过 → 展示标准答案
    }
    // 否则继续留在 translating 阶段
  }, [userInput, currentSentence, currentAttempts, currentProgress, progress]);

  /** 切换到下一句（或回到开头） */
  const handleNextSentence = useCallback(() => {
    if (currentIndex < totalInModule - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setCurrentIndex(0);
    }
    resetForNewSentence();
  }, [currentIndex, totalInModule, resetForNewSentence]);

  /** 切换学习模块 */
  const handleSelectModule = (mod: string) => {
    router.push(`/study?module=${encodeURIComponent(mod)}`);
    resetForNewSentence();
  };

  /** 切换复习菜单展开/收起 */
  const handleToggleReview = () => {
    setShowReview(!showReview);
    router.push(showReview ? "/study" : "/study?review=1");
  };

  /** 将句子从复习菜单中移除 */
  const handleRemoveReview = (sid: string) => {
    const updated = { ...progress };
    if (updated[sid]) {
      updated[sid] = { ...updated[sid], inReview: false };
      setProgress(updated);
      saveProgress(updated);
    }
  };

  // 带圈数字的颜色（根据当前正确率动态变化）
  const currentAccuracyColor =
    currentScore && currentProgress
      ? getAccuracyColor(currentScore.accuracy, currentScore.passed)
      : "#1e293b";

  // 加载中
  if (!currentSentence) {
    return <div className="text-center py-16 text-slate-500">加载中...</div>;
  }

  return (
    <div className="space-y-6 fade-in">
      {/* ═══════════ 顶部：标题 + 复习菜单按钮 ═══════════ */}
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

      {/* ═══════════ 进度条 ═══════════ */}
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full progress-bar"
          style={{ width: `${((currentIndex + 1) / totalInModule) * 100}%` }}
        />
      </div>

      {/* ═══════════ 模块标签切换 ═══════════ */}
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

      {/* ═══════════ 复习菜单面板 ═══════════ */}
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
                      <p className="text-sm font-medium truncate">{s.chineseContext}</p>
                      <p className="text-xs text-slate-400 truncate">{s.targetSentence}</p>
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

      {/* ═══════════ 主卡片 ═══════════ */}
      <div className="bg-white rounded-xl card-shadow p-6 space-y-5">
        {/* ── 序列号 + 带圈尝试次数 ── */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-slate-400">{currentSentence.id}</span>
          <span className="text-sm" style={{ color: currentAccuracyColor }}>
            {circledNum(attemptCount)}
          </span>
          {currentProgress?.passed && (
            <span className="text-xs text-green-500 font-medium">✓ 已通过</span>
          )}
          {currentProgress && !currentProgress.passed && currentAttempts.length >= 3 && (
            <span className="text-xs text-amber-500 font-medium">⚠ 已达上限，待复习</span>
          )}
        </div>

        {/* ── 中文语境 ── */}
        <div className="bg-blue-50 text-blue-800 p-4 rounded-lg">
          <p className="text-sm text-blue-500 mb-1">中文语境</p>
          <p className="text-lg font-medium">{currentSentence.chineseContext}</p>
        </div>

        {/* ── 输入区域（仅在可尝试时显示） ── */}
        {phase === "translating" && !maxAttemptsReached && !currentProgress?.passed && (
          <>
            <div>
              <label htmlFor="translation-input" className="block text-sm font-medium text-slate-700 mb-2">
                请输入英文翻译（第 {Math.min(attemptCount, 3)} 次尝试，最多 3 次）
              </label>
              <textarea
                id="translation-input"
                className="w-full border-2 border-slate-200 rounded-lg p-4 text-base focus:border-primary focus:outline-none resize-none"
                rows={3}
                placeholder="输入你的英文翻译..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && userInput.trim()) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
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

        {/* ── 输入历史（翻译记录） ── */}
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
                    ? currentScore  // 最新一次使用 state 中的结果
                    : scoreTranslation(att.input, currentSentence.targetSentence);  // 历史重新计算

                return (
                  <div key={i} className="space-y-1">
                    {/* 尝试内容 + 正确率 + 状态标记 */}
                    <p className="text-sm" style={{ color }}>
                      第{circledNum(i + 1)}次: {att.input}
                      <span className="ml-2 text-xs">
                        [正确率 {att.accuracy}%] {label}
                      </span>
                    </p>
                    {/* Diff 高亮（非满分时展示具体错漏） */}
                    {att.accuracy < 100 && scoreResult && (
                      <div className="text-xs ml-6">
                        <span className="text-red-500 font-medium mr-1">错/漏:</span>
                        {renderDiffText(
                          scoreResult.diff.filter((d) => d.type !== "correct")
                        )}
                      </div>
                    )}
                    {/* 可升级提示（通过了但用了基础词） */}
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

        {/* ── 标准答案 + 深度解析（通过/达上限后展示） ── */}
        {(phase === "passed" || phase === "maxed_out" || currentProgress?.passed) && (
          <div className="border-t border-slate-200 pt-4 space-y-3 fade-in">
            {/* 标准答案 */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h3 className="font-semibold text-slate-700 mb-1">标准答案</h3>
              <p className="text-lg font-medium text-primary">{currentSentence.targetSentence}</p>
            </div>

            {/* 深度解析 */}
            {currentSentence.deepAnalysis && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-1">深度解析</h3>
                <p className="text-blue-700 text-sm whitespace-pre-wrap">
                  {currentSentence.deepAnalysis}
                </p>
              </div>
            )}

            {/* 词汇升级提示 */}
            {currentSentence.tier1Warning && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-semibold text-amber-700 mb-1">词汇升级提示</h3>
                <p className="text-amber-600 text-sm">
                  日常写作中请尝试用高阶表达替换：
                  <span className="line-through mx-1">{currentSentence.tier1Warning}</span>
                </p>
              </div>
            )}

            {/* 最佳成绩摘要 */}
            {currentProgress && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-1">最佳成绩</h3>
                <p className="text-green-700 text-sm">
                  最高正确率: {currentProgress.bestAccuracy}% ·
                  共尝试 {currentProgress.totalAttempts} 次
                  {currentProgress.passed ? " · 已加入复习菜单" : " · 待复习"}
                </p>
              </div>
            )}

            <button
              onClick={handleNextSentence}
              className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-primary-light transition-colors"
            >
              {currentIndex < totalInModule - 1 ? "下一句" : "返回开头"}
            </button>
          </div>
        )}

        {/* ── 已通过句子的快捷展示（重新访问时） ── */}
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
              <p className="text-lg font-medium text-primary">{currentSentence.targetSentence}</p>
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

/** 页面导出：用 Suspense 包裹以支持 useSearchParams */
export default function StudyPage() {
  return (
    <Suspense fallback={<div className="text-center py-16">加载中...</div>}>
      <StudyContent />
    </Suspense>
  );
}
