import { NextRequest, NextResponse } from "next/server";
import { checkTranslation } from "@/lib/llm";

export async function POST(req: NextRequest) {
  try {
    const { sentenceId, studentInput, stage } = await req.json();

    if (!sentenceId || !studentInput) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const feedback = await checkTranslation(sentenceId, studentInput, stage || "translate");
    return NextResponse.json(feedback);
  } catch (error) {
    console.error("Check translation error:", error);
    return NextResponse.json(
      { error: "Failed to check translation" },
      { status: 500 }
    );
  }
}
