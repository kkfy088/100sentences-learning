import { NextRequest, NextResponse } from "next/server";
import { getSentenceById } from "@/lib/data";
import { scoreTranslation } from "@/lib/scoring";

export async function POST(req: NextRequest) {
  try {
    const { sentenceId, studentInput } = await req.json();

    if (!sentenceId || !studentInput) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const sentence = getSentenceById(sentenceId);
    if (!sentence) {
      return NextResponse.json({ error: "Sentence not found" }, { status: 404 });
    }

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
