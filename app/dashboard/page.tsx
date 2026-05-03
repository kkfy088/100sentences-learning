"use client";

import { useState, useEffect } from "react";
import { modules, getModuleInfo, getSentenceById } from "@/lib/data";
import { SentenceProgress } from "@/lib/types";

const STORAGE_KEY = "100sentences_v2_progress";

interface ModuleStats {
  total: number;
  passed: number;
  bestAvg: number;
  totalAttempts: number;
}

export default function DashboardPage() {
  const [progress, setProgress] = useState<Record<string, SentenceProgress>>({});
  const [activeTab, setActiveTab] = useState<"overview" | "review">("overview");

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        setProgress(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"));
      } catch {}
    }
  }, []);

  const moduleStats: Record<string, ModuleStats> = {};
  for (const mod of modules) {
    const prefix = getModulePrefix(mod);
    const entries = Object.entries(progress).filter(([k]) =>
      k.startsWith(prefix)
    );
    const values = entries.map(([, v]) => v);
    moduleStats[mod] = {
      total: 20,
      passed: values.filter((v) => v.passed).length,
      bestAvg:
        values.length > 0
          ? Math.round(values.reduce((s, v) => s + v.bestAccuracy, 0) / values.length)
          : 0,
      totalAttempts: values.reduce((s, v) => s + v.totalAttempts, 0),
    };
  }

  const totalPassed = Object.values(moduleStats).reduce((s, m) => s + m.passed, 0);
  const totalSentences = 100;
  const totalAttempts = Object.values(moduleStats).reduce((s, m) => s + m.totalAttempts, 0);
  const reviewSentences = Object.entries(progress).filter(
    ([, v]) => v.passed && v.inReview
  );

  return (
    <div className="space-y-8 fade-in">
      <div>
        <h1 className="text-xl font-bold text-primary">学习进度看板</h1>
        <p className="text-sm text-slate-500 mt-1">追踪你的学习成果</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        {(["overview", "review"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-primary text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab === "overview" ? "📊 总体概览" : "📋 复习菜单"}
            {tab === "review" && reviewSentences.length > 0 && (
              <span className="ml-1.5 bg-highlight text-white text-xs px-1.5 py-0.5 rounded-full">
                {reviewSentences.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <>
          {/* Overall stats */}
          <div className="bg-white rounded-xl card-shadow p-6">
            <h2 className="font-semibold text-lg mb-4">总览</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-primary">
                  {totalPassed}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  已通过 / {totalSentences}
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">
                  {Math.round((totalPassed / totalSentences) * 100)}%
                </div>
                <div className="text-xs text-slate-500 mt-1">通过率</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">
                  {totalAttempts}
                </div>
                <div className="text-xs text-slate-500 mt-1">总尝试次数</div>
              </div>
            </div>
            <div className="mt-4 h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full progress-bar"
                style={{ width: `${(totalPassed / totalSentences) * 100}%` }}
              />
            </div>
          </div>

          {/* Module breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modules.map((mod) => {
              const info = getModuleInfo(mod);
              const stats = moduleStats[mod];
              return (
                <div key={mod} className="bg-white rounded-xl card-shadow p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{info.icon}</span>
                    <div>
                      <h3 className="font-semibold">{info.title}</h3>
                      <p className="text-xs text-slate-500">
                        {stats.passed} / {stats.total} 通过 · 均正确率 {stats.bestAvg}%
                      </p>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-success rounded-full progress-bar"
                      style={{ width: `${(stats.passed / stats.total) * 100}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-slate-400">
                    <span>{stats.totalAttempts} 次尝试</span>
                    <span>{Math.round((stats.passed / stats.total) * 100)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* Review tab */
        <div className="bg-white rounded-xl card-shadow p-6">
          <h2 className="font-semibold text-lg mb-4">
            📋 复习菜单 ({reviewSentences.length})
          </h2>
          {reviewSentences.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">
              暂无待复习句子。通过任意句子后，它们将自动出现在这里。
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {reviewSentences.map(([sid, rp]) => {
                const s = getSentenceById(sid);
                if (!s) return null;
                return (
                  <div
                    key={sid}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-400">
                          {sid}
                        </span>
                        <p className="text-sm font-medium truncate">
                          {s.chineseContext}
                        </p>
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {s.targetSentence}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        正确率 {rp.bestAccuracy}% · 尝试 {rp.totalAttempts} 次
                      </p>
                    </div>
                    <span
                      className={`ml-3 text-xs px-2 py-1 rounded-full shrink-0 ${
                        rp.bestAccuracy >= 90
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {rp.bestAccuracy >= 90 ? "⭐ 优秀" : "📝 待巩固"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getModulePrefix(mod: string): string {
  const map: Record<string, string> = {
    "核心动词升维": "m1",
    "精准形容词与副词替换": "m2",
    "高级逻辑连接词与过渡网络": "m3",
    "学术论证与思辨框架": "m4",
    "复杂句法多样性与长难句搭建": "m5",
  };
  return map[mod] || "";
}
