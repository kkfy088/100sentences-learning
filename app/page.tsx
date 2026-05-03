/**
 * 首页 — 入口页面
 *
 * 展示项目简介、五大模块入口和核心学习方法论。
 */

import Link from "next/link";
import { modules, getModuleInfo } from "@/lib/data";

export default function HomePage() {
  return (
    <div className="space-y-10">
      {/* 标题区域 */}
      <section className="text-center space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-primary">
          高分100句
        </h1>
        <p className="text-lg text-slate-600 max-w-xl mx-auto">
          基于英美CCSS与GCSE考纲，100个高阶句型助你突破中式英语瓶颈，实现词汇与句法全面升维
        </p>
        <div className="flex items-center justify-center gap-4 pt-2">
          <Link
            href="/study"
            className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-light transition-colors"
          >
            开始学习
          </Link>
          <Link
            href="/dictation"
            className="px-6 py-3 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
          >
            听写闯关
          </Link>
        </div>
      </section>

      {/* 五大学习模块卡片 */}
      <section>
        <h2 className="text-xl font-semibold mb-6">五大学习模块</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map((mod) => {
            const info = getModuleInfo(mod);
            return (
              <Link
                key={mod}
                href={`/study?module=${encodeURIComponent(mod)}`}
                className="block p-5 bg-white rounded-xl card-shadow hover:card-shadow-hover transition-all group"
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{info.icon}</span>
                  <div>
                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                      {info.title}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">{info.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 学习方法论 — 三步闭环 */}
      <section className="bg-white rounded-xl p-6 card-shadow">
        <h2 className="text-xl font-semibold mb-4">学习方法论</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <h3 className="font-semibold">翻译尝试</h3>
            <p className="text-sm text-slate-500">
              根据中文语境，主动翻译并输出你的第一版英文
            </p>
          </div>
          <div className="space-y-2">
            <div className="w-10 h-10 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <h3 className="font-semibold">智能比对</h3>
            <p className="text-sm text-slate-500">
              系统逐词比对标准答案，计算正确率并标注具体错误
            </p>
          </div>
          <div className="space-y-2">
            <div className="w-10 h-10 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold">
              3
            </div>
            <h3 className="font-semibold">巩固回顾</h3>
            <p className="text-sm text-slate-500">
              多次尝试强化记忆，通过句子自动加入复习菜单
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
