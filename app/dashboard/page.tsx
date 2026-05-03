"use client";

import { useState, useEffect } from "react";
import { modules, getModuleInfo } from "@/lib/data";

interface ModuleProgress {
  total: number;
  learned: number;
}

export default function DashboardPage() {
  const [progress, setProgress] = useState<Record<string, { learned: boolean }>>({});
  const [storageKey] = useState("100sentences_progress");

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) setProgress(JSON.parse(saved));
  }, [storageKey]);

  const moduleStats = modules.map((mod) => {
    const info = getModuleInfo(mod);
    const total = 20;
    const learned = Object.keys(progress).filter(
      (k) => k.startsWith(getModulePrefix(mod)) && progress[k]?.learned
    ).length;
    return { mod, info, total, learned };
  });

  const totalLearned = moduleStats.reduce((sum, s) => sum + s.learned, 0);
  const totalSentences = 100;

  return (
    <div className="space-y-8 fade-in">
      <div>
        <h1 className="text-xl font-bold text-primary">学习进度看板</h1>
        <p className="text-sm text-slate-500 mt-1">追踪你的学习和记忆进度</p>
      </div>

      {/* Overall progress */}
      <div className="bg-white rounded-xl card-shadow p-6">
        <h2 className="font-semibold text-lg mb-4">总览</h2>
        <div className="flex items-center gap-6">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-600">整体进度</span>
              <span className="font-semibold text-primary">
                {totalLearned} / {totalSentences}
              </span>
            </div>
            <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full progress-bar"
                style={{ width: `${(totalLearned / totalSentences) * 100}%` }}
              />
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">
              {Math.round((totalLearned / totalSentences) * 100)}%
            </div>
            <div className="text-xs text-slate-500">完成率</div>
          </div>
        </div>
      </div>

      {/* Module breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {moduleStats.map(({ mod, info, total, learned }) => (
          <div key={mod} className="bg-white rounded-xl card-shadow p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{info.icon}</span>
              <div>
                <h3 className="font-semibold">{info.title}</h3>
                <p className="text-xs text-slate-500">
                  {learned} / {total} 句已掌握
                </p>
              </div>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-success rounded-full progress-bar"
                style={{ width: `${(learned / total) * 100}%` }}
              />
            </div>
            <div className="mt-2 text-right text-xs text-slate-400">
              {Math.round((learned / total) * 100)}%
            </div>
          </div>
        ))}
      </div>

      {/* Learning tips */}
      <div className="bg-white rounded-xl card-shadow p-6">
        <h2 className="font-semibold text-lg mb-4">学习建议</h2>
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            💡 <strong>翻译 → AI诊断 → 清空重写：</strong>
            这是最高效的学习闭环。先主动输出，再借助AI对比提升，最后通过清空重写形成肌肉记忆。
          </p>
          <p>
            🔄 <strong>间隔重复：</strong>
            每完成一个句子的学习，系统会根据你的正确率自动安排复习时间。
          </p>
          <p>
            📝 <strong>听写巩固：</strong>
            当你通过翻译模块掌握句子后，进入听写模块进行盲听训练，将视觉记忆转化为听觉-肌肉的条件反射。
          </p>
        </div>
      </div>
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
