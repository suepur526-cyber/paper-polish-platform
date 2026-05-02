import OpenAI from "openai";

export type RewriteCandidateRequest = {
  text: string;
  protectedTerms: string[];
  numberingPrefix: string | null;
};

export interface RewriteModelAdapter {
  createCandidates(request: RewriteCandidateRequest): Promise<string[]>;
  chooseBestCandidate(original: string, candidates: string[]): Promise<string>;
}

const DEFAULT_BASE_URL = "https://allinai7.cloud/v1";
const DEFAULT_REWRITE_MODEL = "gpt-5.5";

export function getRewriteModelAdapter(): RewriteModelAdapter | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL ?? DEFAULT_BASE_URL
  });

  return new OpenAIRewriteModelAdapter(
    client,
    process.env.OPENAI_REWRITE_MODEL ?? DEFAULT_REWRITE_MODEL
  );
}

class OpenAIRewriteModelAdapter implements RewriteModelAdapter {
  constructor(
    private readonly client: OpenAI,
    private readonly model: string
  ) {}

  async createCandidates(request: RewriteCandidateRequest) {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      store: false,
      messages: [
        {
          role: "system",
          content:
            "你是严谨的中文学术论文润色助手。只改写表达，不改变原意，不增删引用、编号、术语和数字。返回严格 JSON。"
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "生成 3 个候选润色版本",
            requirements: [
              "保留原意",
              "保持学术语体",
              "减少模板化表达",
              "长度控制在原文正负 5% 以内",
              "不得删除、增加或改写 protectedTerms 中的内容",
              "如果 numberingPrefix 存在，候选文本必须以它开头"
            ],
            outputSchema: { candidates: ["候选一", "候选二", "候选三"] },
            text: request.text,
            protectedTerms: request.protectedTerms,
            numberingPrefix: request.numberingPrefix
          })
        }
      ]
    });

    const content = completion.choices[0]?.message.content ?? "";
    const parsed = parseJsonObject(content);
    if (Array.isArray(parsed?.candidates)) {
      return parsed.candidates.filter((candidate): candidate is string => {
        return typeof candidate === "string" && candidate.trim().length > 0;
      });
    }

    return content.trim() ? [content.trim()] : [request.text];
  }

  async chooseBestCandidate(original: string, candidates: string[]) {
    if (candidates.length <= 1) return candidates[0] ?? original;

    const completion = await this.client.chat.completions.create({
      model: this.model,
      store: false,
      messages: [
        {
          role: "system",
          content:
            "你是论文润色质量复核助手。选择最符合原意、自然度、学术规范、引用和长度约束的候选。返回严格 JSON。"
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "从候选中选择最佳版本",
            outputSchema: { index: 0 },
            original,
            candidates
          })
        }
      ]
    });

    const content = completion.choices[0]?.message.content ?? "";
    const parsed = parseJsonObject(content);
    const index = typeof parsed?.index === "number" ? parsed.index : 0;
    return candidates[index] ?? candidates[0] ?? original;
  }
}

function parseJsonObject(content: string): Record<string, unknown> | null {
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}
