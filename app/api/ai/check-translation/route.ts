/**
 * API 路由 — 翻译比对接口
 *
 * 接收学生的翻译输入，与标准答案进行比对，返回评分结果。
 *
 * POST /api/ai/check-translation
 * Body: { sentenceId: string, studentInput: string }
 * Response: ScoringResult（正确率、逐词Diff、是否通过等）
 */

import { NextRequest, NextResponse } from "next/server";
import { getSentenceById } from "@/lib/data";
import { scoreTranslation } from "@/lib/scoring";

export async function POST(req: NextRequest) {
  try {
    // 解析请求体
    const { sentenceId, studentInput } = await req.json();

    // 参数校验
    if (!sentenceId || !studentInput) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 查找句子
    const sentence = getSentenceById(sentenceId);
    if (!sentence) {
      return NextResponse.json({ error: "Sentence not found" }, { status: 404 });
    }

    // 执行比对评分
    const result = scoreTranslation(studentInput, sentence.targetSentence);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Check translation error:", error);
    return NextResponse.json(
      { error: "Failed to check translation" },
      { status: 500 }
    );
  }
}
