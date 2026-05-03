"use client";

import { useState, useEffect } from "react";
import { getAllSentencesSync } from "@/lib/data";
import { Sentence } from "@/lib/types";
import { calculateNextReview, qualityFromAccuracy } from "@/lib/srs";

export default function DictationPage() {
  const [sentences] = useState<Sentence[]>(() => getAllSentencesSync());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showEnglish, setShowEnglish] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [result, setResult] = useState<"idle" | "checking" | "correct" | "incorrect">("idle");
  const [diffHighlights, setDiffHighlights] = useState<React.ReactNode[]>([]);

  const currentSentence = sentences[currentIndex] || null;
  const totalDictation = sentences.length;

  const handleRandom = () => {
    setCurrentIndex(Math.floor(Math.random() * sentences.length));
    resetState();
  };

  const resetState = () => {
    setUserInput("");
    setShowEnglish(false);
    setResult("idle");
    setDiffHighlights([]);
  };

  const handleCheck = () => {
    if (!currentSentence || !userInput.trim()) return;
    setResult("checking");

    const target = currentSentence.targetSentence;
    const input = userInput.trim();

    if (input.toLowerCase() === target.toLowerCase()) {
      setResult("correct");
      setDiffHighlights([<span key="ok" className="text-green-600 font-medium">{target}</span>]);
    } else {
      setResult("incorrect");
      const diff = computeDiff(input, target);
      setDiffHighlights(diff);
    }
    setShowEnglish(true);
  };

  const handleNext = () => {
    if (currentIndex < totalDictation - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setCurrentIndex(0);
    }
    resetState();
  };

  if (!currentSentence) {
    return <div className="text-center py-16 text-slate-500">加载中...</div>;
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-primary">听写闯关</h1>
          <p className="text-sm text-slate-500 mt-1">听写完成后进行逐字比对</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            {currentIndex + 1} / {totalDictation}
          </span>
          <button
            onClick={handleRandom}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm hover:bg-slate-50 transition-colors"
          >
            随机一句
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl card-shadow p-6 space-y-6">
        {/* Chinese context */}
        <div className="bg-blue-50 text-blue-800 p-4 rounded-lg">
          <p className="text-sm text-blue-500 mb-1">听写提示</p>
          <p className="text-lg font-medium">{currentSentence.chineseContext}</p>
        </div>

        {/* Audio simulator */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => {}}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            title="音频功能尚未接入，请根据中文提示拼写"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
            <span className="text-sm text-slate-600">播放音频（待接入）</span>
          </button>
          <span className="text-xs text-slate-400">请根据中文提示盲听拼写</span>
        </div>

        {/* Input */}
        <div>
          <textarea
            className="w-full border-2 border-slate-200 rounded-lg p-4 text-base focus:border-primary focus:outline-none resize-none"
            rows={3}
            placeholder="请输入你听到的英文句子..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            disabled={showEnglish}
            autoFocus
          />
        </div>

        {!showEnglish ? (
          <button
            onClick={handleCheck}
            disabled={!userInput.trim()}
            className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-primary-light disabled:bg-slate-300 transition-colors"
          >
            提交比对
          </button>
        ) : (
          <div className="space-y-4 fade-in">
            {/* Result */}
            {result === "correct" ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <p className="text-green-700 font-bold text-lg">完全正确！</p>
                <p className="text-green-600 text-sm mt-1">听写准确，完美通关</p>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 font-semibold mb-2">存在差异，请对照：</p>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-red-500 font-medium">你的输入：</span>
                    <p className="text-red-600 mt-1">{userInput}</p>
                  </div>
                  <div>
                    <span className="text-green-600 font-medium">标准答案：</span>
                    <p className="text-green-700 mt-1 font-medium">
                      {currentSentence.targetSentence}
                    </p>
                  </div>
                </div>
                {diffHighlights.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-red-200">
                    <span className="text-red-500 font-medium text-sm">逐字比对：</span>
                    <div className="mt-1 text-sm">{diffHighlights}</div>
                  </div>
                )}
              </div>
            )}

            {currentSentence.deepAnalysis && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-1">知识点回顾</h3>
                <p className="text-blue-700 text-sm">{currentSentence.deepAnalysis}</p>
              </div>
            )}

            <button
              onClick={handleNext}
              className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-primary-light transition-colors"
            >
              {currentIndex < totalDictation - 1 ? "下一句" : "重新开始"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function computeDiff(input: string, target: string): React.ReactNode[] {
  const iWords = input.split(/\s+/);
  const tWords = target.split(/\s+/);
  const maxLen = Math.max(iWords.length, tWords.length);
  const result: React.ReactNode[] = [];

  for (let j = 0; j < maxLen; j++) {
    const iw = iWords[j] || "";
    const tw = tWords[j] || "";
    if (iw.toLowerCase() === tw.toLowerCase()) {
      result.push(
        <span key={j} className="text-green-600 mr-1">
          {tw}
        </span>
      );
    } else {
      if (iw && iw !== tw) {
        result.push(
          <span key={`i${j}`} className="text-red-500 line-through mr-1">
            {iw}
          </span>
        );
      }
      if (tw) {
        result.push(
          <span key={`t${j}`} className="text-green-600 font-medium mr-1">
            {tw}
          </span>
        );
      }
    }
  }
  return result;
}
