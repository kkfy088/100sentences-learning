"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  modules,
  getSentencesByModule,
  getModuleInfo,
  getSentenceById,
  getAllSentencesSync,
} from "@/lib/data";
import { Sentence, CardState, AIFeedback, StudyRecord } from "@/lib/types";
import { calculateNextReview, qualityFromAccuracy } from "@/lib/srs";

function StudyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const moduleParam = searchParams.get("module");

  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardState, setCardState] = useState<CardState>("TRANSLATE_FIRST");
  const [userInput, setUserInput] = useState("");
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<AIFeedback | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<Record<string, { learned: boolean }>>({});

  useEffect(() => {
    if (moduleParam && modules.includes(moduleParam as typeof modules[number])) {
      setSentences(getSentencesByModule(moduleParam as typeof modules[number]));
    } else {
      setSentences(getAllSentencesSync());
    }
    const saved = localStorage.getItem("100sentences_progress");
    if (saved) setProgress(JSON.parse(saved));
  }, [moduleParam]);

  useEffect(() => {
    if (sentences.length > 0) {
      localStorage.setItem("100sentences_progress", JSON.stringify(progress));
    }
  }, [progress, sentences.length]);

  const currentSentence = sentences[currentIndex] || null;
  const moduleInfo = currentSentence ? getModuleInfo(currentSentence.module) : null;
  const totalInModule = sentences.length;

  const handleSubmitTranslation = useCallback(async () => {
    if (!userInput.trim() || !currentSentence) return;
    setIsLoading(true);
    const newHistory = [...inputHistory, userInput];
    setInputHistory(newHistory);

    try {
      const res = await fetch("/api/ai/check-translation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sentenceId: currentSentence.id,
          studentInput: userInput,
          stage: cardState === "PERFECT_REWRITE" ? "rewrite" : "translate",
        }),
      });
      const data = await res.json();
      setFeedback(data);
      if (cardState === "TRANSLATE_FIRST") {
        setCardState("AI_REVIEW");
      } else if (cardState === "PERFECT_REWRITE") {
        if (data.overallScore >= 90) {
          const quality = qualityFromAccuracy(data.overallScore / 100);
          const srsResult = calculateNextReview(quality, {
            repetitionCount: 0,
            easeFactor: 2.5,
            intervalDays: 1,
          });
          setCardState("COMPLETED");
          setProgress((prev) => ({
            ...prev,
            [currentSentence.id]: { learned: true },
          }));
        } else {
          setCardState("REWRITE_FEEDBACK");
        }
      }
    } catch {
      setFeedback({
        grammarCorrection: "请参考标准答案检查语法和拼写。",
        collocationsAnalysis: currentSentence.deepAnalysis,
        errorTags: [],
        encouragement: "继续加油！",
        overallScore: 0,
      });
      if (cardState === "TRANSLATE_FIRST") setCardState("AI_REVIEW");
      else if (cardState === "PERFECT_REWRITE") setCardState("REWRITE_FEEDBACK");
    } finally {
      setIsLoading(false);
    }
  }, [userInput, currentSentence, cardState, inputHistory]);

  const handleClearAndRewrite = () => {
    setUserInput("");
    setFeedback(null);
    setCardState("PERFECT_REWRITE");
  };

  const handleNextSentence = () => {
    if (currentIndex < totalInModule - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setCurrentIndex(0);
    }
    setUserInput("");
    setInputHistory([]);
    setFeedback(null);
    setCardState("TRANSLATE_FIRST");
  };

  const handleSelectModule = (mod: string) => {
    router.push(`/study?module=${encodeURIComponent(mod)}`);
    setCurrentIndex(0);
    setCardState("TRANSLATE_FIRST");
    setUserInput("");
    setInputHistory([]);
    setFeedback(null);
  };

  if (!currentSentence) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">加载中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-primary">学习闯关</h1>
          {moduleInfo && (
            <p className="text-sm text-slate-500 mt-1">
              {moduleInfo.icon} {moduleInfo.title}
            </p>
          )}
        </div>
        <div className="flex gap-1 text-sm text-slate-500">
          {currentIndex + 1} / {totalInModule}
        </div>
      </div>

      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full progress-bar"
          style={{ width: `${((currentIndex + 1) / totalInModule) * 100}%` }}
        />
      </div>

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

      {/* Input history (灰色小号字体) */}
      {inputHistory.length > 0 && cardState !== "TRANSLATE_FIRST" && (
        <div className="space-y-1">
          {inputHistory.map((h, i) => (
            <p key={i} className="history-text">
              第{i + 1}次输入: {h}
            </p>
          ))}
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white rounded-xl card-shadow p-6 space-y-6">
        {/* Chinese context */}
        <div className="bg-blue-50 text-blue-800 p-4 rounded-lg">
          <p className="text-sm text-blue-500 mb-1">中文语境</p>
          <p className="text-lg font-medium">{currentSentence.chineseContext}</p>
        </div>

        {/* TRANSLATE_FIRST / PERFECT_REWRITE: Input area */}
        {(cardState === "TRANSLATE_FIRST" || cardState === "PERFECT_REWRITE") && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {cardState === "TRANSLATE_FIRST"
                  ? "请根据中文写出你的英文翻译"
                  : "请清空记忆，重新默写标准答案"}
              </label>
              <textarea
                className="w-full border-2 border-slate-200 rounded-lg p-4 text-base focus:border-primary focus:outline-none resize-none"
                rows={3}
                placeholder="输入你的英文翻译..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={isLoading}
                autoFocus
              />
            </div>
            <button
              onClick={handleSubmitTranslation}
              disabled={!userInput.trim() || isLoading}
              className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-primary-light disabled:bg-slate-300 transition-colors"
            >
              {isLoading ? "AI 诊断中..." : "提交诊断"}
            </button>
          </>
        )}

        {/* AI_REVIEW / REWRITE_FEEDBACK: Show feedback */}
        {(cardState === "AI_REVIEW" || cardState === "REWRITE_FEEDBACK") && feedback && (
          <div className="space-y-4 fade-in">
            {/* Encouragement */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">{feedback.encouragement}</p>
              {feedback.overallScore > 0 && (
                <p className="text-sm text-green-600 mt-1">
                  综合评分: {feedback.overallScore}/100
                </p>
              )}
            </div>

            {/* Grammar correction */}
            {feedback.grammarCorrection && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-semibold text-amber-800 mb-1">语法纠错</h3>
                <p className="text-amber-700 text-sm">{feedback.grammarCorrection}</p>
              </div>
            )}

            {/* Collocations analysis */}
            {feedback.collocationsAnalysis && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-semibold text-purple-800 mb-1">词伙与句式讲解</h3>
                <p className="text-purple-700 text-sm">{feedback.collocationsAnalysis}</p>
              </div>
            )}

            {/* Standard answer */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h3 className="font-semibold text-slate-700 mb-1">标准答案</h3>
              <p className="text-lg font-medium text-primary">
                {currentSentence.targetSentence}
              </p>
            </div>

            {/* Tier1 warning */}
            {currentSentence.tier1Warning && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-700 mb-1">常见误区</h3>
                <p className="text-red-600 text-sm">
                  注意避免使用:{" "}
                  <span className="line-through">{currentSentence.tier1Warning}</span>
                </p>
              </div>
            )}

            {/* Deep analysis */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-1">深度解析</h3>
              <p className="text-blue-700 text-sm whitespace-pre-wrap">
                {currentSentence.deepAnalysis}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleClearAndRewrite}
                className="flex-1 bg-primary text-white font-bold py-3 rounded-lg hover:bg-primary-light transition-colors"
              >
                清空重写标准答案
              </button>
              {feedback.overallScore >= 90 && (
                <button
                  onClick={handleNextSentence}
                  className="flex-1 bg-success text-white font-bold py-3 rounded-lg hover:bg-green-600 transition-colors"
                >
                  下一句
                </button>
              )}
            </div>
          </div>
        )}

        {/* COMPLETED */}
        {cardState === "COMPLETED" && (
          <div className="text-center space-y-4 fade-in">
            <div className="text-5xl">🎉</div>
            <h3 className="text-xl font-bold text-success">完美掌握！</h3>
            <p className="text-slate-500">你已成功掌握这个高阶句式</p>
            <div className="bg-green-50 rounded-lg p-4 text-left">
              <p className="font-medium text-green-800">标准答案</p>
              <p className="text-lg text-primary">{currentSentence.targetSentence}</p>
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
