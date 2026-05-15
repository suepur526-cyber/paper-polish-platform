import OpenAI from "openai";

export type RewriteCandidateRequest = {
  text: string;
  protectedTerms: string[];
  numberingPrefix: string | null;
};

export interface RewriteModelAdapter {
  detectProtectedTerms?(text: string): Promise<string[]>;
  detectProtectedTermsBatch?(texts: string[]): Promise<string[][]>;
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

  async detectProtectedTerms(text: string) {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      store: false,
      messages: [
        {
          role: "system",
          content:
            "你是论文润色前的保护片段识别助手。只识别不能被改写、删除、换序的原文片段，返回严格 JSON。"
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "识别这段文字中的保护片段",
            rules: [
              "章节导语前缀必须保护，例如“第1章 绪论：”“3.2.1 功能需求分析：”",
              "没有冒号的章节导语也必须保护章节序号，例如“第一章主要...”“第二章梳理...”“第七章归纳...”中的“第一章”“第二章”“第七章”",
              "编号后紧跟小标题时必须整体保护，例如“（1）性能需求：”“（2）安全需求：”“3）兼容性需求：”“4. 可维护性需求：”",
              "如果编号后疑似小标题但漏写冒号，也要保护原文连续片段，例如“（2）客户端使用Windows系统...”中的“（2）客户端”",
              "有序编号、项目编号、图表编号、引用标记、专有名词、英文技术名词必须保护",
              "只返回原文中连续出现的片段，不要改写，不要补造",
              "如果保护片段在句首承担结构定位作用，有冒号或右括号时必须完整包含冒号或右括号；没有冒号时至少保留章节编号本身"
            ],
            outputSchema: { terms: ["原文保护片段"] },
            text
          })
        }
      ]
    });

    const parsed = parseJsonObject(completion.choices[0]?.message.content ?? "");
    return Array.isArray(parsed?.terms)
      ? parsed.terms.filter((term): term is string => typeof term === "string" && text.includes(term))
      : [];
  }

  async detectProtectedTermsBatch(texts: string[]) {
    if (texts.length === 0) return [];

    const completion = await this.client.chat.completions.create({
      model: this.model,
      store: false,
      messages: [
        {
          role: "system",
          content:
            "你是论文润色前的保护片段识别助手。只识别不能被改写、删除或换序的原文连续片段。返回严格 JSON，不要解释。"
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "批量识别这些论文段落中的保护片段",
            rules: [
              "章节导语前缀、编号、小标题、图表编号、引用标记、专有名词、英文技术名词必须保护",
              "编号后紧跟小标题时要整体保护，例如（1）性能需求：、（2）客户端、3. 数据库设计",
              "疑似漏写冒号的小标题也要保护编号加小标题，不要只返回编号",
              "只返回原文中连续出现的片段，不要改写，不要补造"
            ],
            outputSchema: {
              results: [
                {
                  index: 0,
                  terms: ["原文连续出现的保护片段"]
                }
              ]
            },
            paragraphs: texts.map((text, index) => ({ index, text }))
          })
        }
      ]
    });

    const parsed = parseJsonObject(completion.choices[0]?.message.content ?? "");
    if (!Array.isArray(parsed?.results)) return texts.map(() => []);

    const byIndex = new Map<number, string[]>();
    for (const result of parsed.results) {
      if (!result || typeof result !== "object") continue;
      const index = (result as { index?: unknown }).index;
      const terms = (result as { terms?: unknown }).terms;
      if (!Number.isInteger(index) || !Array.isArray(terms)) continue;
      const text = texts[index as number];
      if (typeof text !== "string") continue;
      byIndex.set(
        index as number,
        terms.filter((term): term is string => typeof term === "string" && text.includes(term))
      );
    }

    return texts.map((_, index) => byIndex.get(index) ?? []);
  }

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
              "不得删除、增加、改写或换序 protectedTerms 中的内容",
              "如果 protectedTerms 中有章节导语前缀，例如“第1章 绪论：”，候选文本必须仍以该前缀开头",
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
