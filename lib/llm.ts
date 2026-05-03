import { Sentence, AIFeedback } from "@/lib/types";
import { getSentenceById } from "@/lib/data";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export async function checkTranslation(
  sentenceId: string,
  studentInput: string,
  stage: "translate" | "rewrite" | "dictation"
): Promise<AIFeedback> {
  const sentence = getSentenceById(sentenceId);
  if (!sentence) {
    throw new Error("Sentence not found");
  }

  const prompt = buildPrompt(sentence, studentInput, stage);

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: [
        {
          role: "system",
          content: `你是一位精通第二语言习得（SLA）理论的英美初中英语写作导师。你的学生主要是母语为中文的亚洲学生。
中文是"意合语言"，结构松散；而英语是"形合语言"，高度依赖介词、连词等显性语法标记来构建逻辑网络。
中国学生在写作时极易出现句式单一、缺乏连接词以及过度使用基础词汇（Tier 1）的"中介语"现象。
请以 JSON 格式输出你的点评。`,
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 800,
    });

    const content = completion.choices[0]?.message?.content || "{}";
    return JSON.parse(content) as AIFeedback;
  } catch (error) {
    console.error("OpenAI API error:", error);
    return fallbackFeedback(sentence, studentInput);
  }
}

function buildPrompt(sentence: Sentence, studentInput: string, stage: string): string {
  return `请分析学生的英语翻译尝试。

【原始中文】: ${sentence.chineseContext}
【标准答案】: ${sentence.targetSentence}
【易错低阶词】: ${sentence.tier1Warning}
【深度解析】: ${sentence.deepAnalysis}
【学生输入】: ${studentInput}
【当前阶段】: ${stage === "translate" ? "首次翻译" : stage === "rewrite" ? "清空重写" : "听写"}

请以 JSON 格式输出，包含以下字段：
{
  "grammarCorrection": "指出基础语法错误（时态、单复数、拼写等）",
  "collocationsAnalysis": "对比标准答案，指出学生用词的不足（如使用基础词），讲解高级词伙的用法和升级路径",
  "errorTags": ["标签1", "标签2"],
  "encouragement": "简短的鼓励话语",
  "overallScore": 0-100的分数
}

errorTags 可包含:
- "grammar:tense" (时态错误)
- "grammar:agreement" (主谓一致)
- "grammar:article" (冠词遗漏)
- "grammar:preposition" (介词错误)
- "vocab:tier1_used" (使用了基础词汇替代高级词汇)
- "vocab:missed_keyword" (遗漏了目标高阶词)
- "structure:missing_connector" (遗漏连接词)
- "structure:word_order" (语序问题)
- "spelling" (拼写错误)
- "perfect" (完美)

若学生输入完全匹配标准答案，errorTags 只含 "perfect"，overallScore 为 100。`;
}

function fallbackFeedback(sentence: Sentence, studentInput: string): AIFeedback {
  const isPerfect = studentInput.trim() === sentence.targetSentence.trim();
  const similarity = calculateSimilarity(studentInput, sentence.targetSentence);
  const score = Math.round(similarity * 100);

  const errorTags: string[] = [];
  if (sentence.tier1Warning) {
    const tier1Words = sentence.tier1Warning.split(" / ");
    for (const w of tier1Words) {
      if (studentInput.toLowerCase().includes(w.toLowerCase())) {
        errorTags.push("vocab:tier1_used");
        break;
      }
    }
  }

  return {
    grammarCorrection: isPerfect
      ? "没有语法错误，你的输入与标准答案完全一致！"
      : "请参考标准答案检查语法和拼写。",
    collocationsAnalysis: errorTags.includes("vocab:tier1_used")
      ? `注意：标准答案中使用了更高阶的词汇来替代你用的基础词。${sentence.deepAnalysis}`
      : sentence.deepAnalysis,
    errorTags: isPerfect ? ["perfect"] : errorTags,
    encouragement: isPerfect
      ? "太棒了！你已经完美掌握了这个高级句式！"
      : "继续加油！仔细对比标准答案，看看哪些地方可以提升。",
    overallScore: score,
  };
}

function calculateSimilarity(a: string, b: string): number {
  const aWords = a.toLowerCase().split(/\s+/);
  const bWords = b.toLowerCase().split(/\s+/);
  const setA = new Set(aWords);
  const setB = new Set(bWords);
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}
