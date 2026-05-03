import OpenAI from "openai";
import {
  isBackMatterHeading,
  isCaptionLine,
  isCodeLikeParagraph,
  isReferenceEntry,
  isReferenceHeading,
  isTocEntry,
  isTocHeading
} from "@/lib/document/classifier";
import type { ParsedParagraph } from "@/lib/document/parser";

export type StructureReviewCorrection = {
  index: number;
  type?: string;
  selected?: boolean;
  skipReason?: string | null;
  outlinePath?: string;
  riskLevel?: string;
};

export interface DocumentStructureReviewer {
  reviewParagraphs(paragraphs: ParsedParagraph[]): Promise<StructureReviewCorrection[]>;
}

const DEFAULT_BASE_URL = "https://allinai7.cloud/v1";
const DEFAULT_STRUCTURE_MODEL = "gpt-5.5";
const PARAGRAPH_TYPE_SET = new Set(["heading", "abstract", "keywords", "reference", "body", "skipped"]);
const RISK_LEVEL_SET = new Set(["low", "medium", "high"]);

export function getDocumentStructureReviewer(): DocumentStructureReviewer | null {
  if (process.env.OPENAI_STRUCTURE_REVIEW === "false") return null;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL ?? DEFAULT_BASE_URL
  });

  return new OpenAIDocumentStructureReviewer(
    client,
    process.env.OPENAI_STRUCTURE_MODEL ?? process.env.OPENAI_REWRITE_MODEL ?? DEFAULT_STRUCTURE_MODEL
  );
}

export async function reviewDocumentStructure(
  paragraphs: ParsedParagraph[],
  reviewer: DocumentStructureReviewer | null = getDocumentStructureReviewer()
) {
  if (!reviewer) return enforceStructureGuardrails(paragraphs);

  try {
    const corrections = await reviewer.reviewParagraphs(paragraphs);
    return enforceStructureGuardrails(applyStructureReviewCorrections(paragraphs, corrections));
  } catch {
    return enforceStructureGuardrails(paragraphs);
  }
}

export function applyStructureReviewCorrections(
  paragraphs: readonly ParsedParagraph[],
  corrections: readonly StructureReviewCorrection[]
) {
  const byIndex = new Map<number, StructureReviewCorrection>();
  for (const correction of corrections) {
    if (Number.isInteger(correction.index)) byIndex.set(correction.index, correction);
  }

  return paragraphs.map((paragraph) => {
    const correction = byIndex.get(paragraph.index);
    if (!correction) return { ...paragraph };

    const next = { ...paragraph };
    if (typeof correction.type === "string" && PARAGRAPH_TYPE_SET.has(correction.type)) {
      next.type = correction.type;
    }
    if (typeof correction.selected === "boolean") next.selected = correction.selected;
    if (typeof correction.skipReason === "string" || correction.skipReason === null) {
      next.skipReason = correction.skipReason;
    }
    if (typeof correction.outlinePath === "string" && correction.outlinePath.trim()) {
      next.outlinePath = correction.outlinePath.trim().slice(0, 60);
    }
    if (typeof correction.riskLevel === "string" && RISK_LEVEL_SET.has(correction.riskLevel)) {
      next.riskLevel = correction.riskLevel;
    }
    return next;
  });
}

export function enforceStructureGuardrails(paragraphs: readonly ParsedParagraph[]) {
  return paragraphs.map((paragraph) => {
    const text = paragraph.text.trim();
    if (isTocHeading(text)) {
      return lockParagraph(paragraph, {
        type: "heading",
        skipReason: "目录标题默认跳过",
        outlinePath: text,
        riskLevel: "medium"
      });
    }
    if (isTocEntry(text)) {
      return lockParagraph(paragraph, {
        type: "skipped",
        skipReason: "目录内容默认跳过",
        riskLevel: "medium"
      });
    }
    if (isReferenceHeading(text) || isReferenceEntry(text)) {
      return lockParagraph(paragraph, {
        type: "reference",
        skipReason: "参考文献默认跳过",
        outlinePath: isReferenceHeading(text) ? text : paragraph.outlinePath,
        riskLevel: "medium"
      });
    }
    if (isBackMatterHeading(text)) {
      return lockParagraph(paragraph, {
        type: "skipped",
        skipReason: "致谢、附录等后置内容默认跳过",
        outlinePath: text,
        riskLevel: "medium"
      });
    }
    if (isCaptionLine(text)) {
      return lockParagraph(paragraph, {
        type: "skipped",
        skipReason: "图表题注默认跳过",
        riskLevel: "medium"
      });
    }
    if (isCodeLikeParagraph(text)) {
      return lockParagraph(paragraph, {
        type: "skipped",
        skipReason: "代码片段默认跳过",
        riskLevel: "medium"
      });
    }
    return { ...paragraph };
  });
}

class OpenAIDocumentStructureReviewer implements DocumentStructureReviewer {
  constructor(
    private readonly client: OpenAI,
    private readonly model: string
  ) {}

  async reviewParagraphs(paragraphs: ParsedParagraph[]) {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      store: false,
      messages: [
        {
          role: "system",
          content:
            "你是中文论文结构识别复检助手。你只复核段落类型、大纲归属和是否应跳过，不润色文本。返回严格 JSON。"
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "复检论文解析结果，修正被误判的目录、题注、标题、正文、参考文献、致谢和附录",
            rules: [
              "图/表题注、目录项、参考文献、致谢、附录必须 selected=false",
              "代码片段、接口代码、SQL、配置片段、变量/方法密集的程序文本必须 selected=false",
              "参考文献和致谢必须成为独立大纲区域，不要挂到最后一个正文小节下面",
              "只有正文和摘要正文可以 selected=true",
              "标题、目录标题、关键词行、参考文献标题、致谢标题、代码片段都不能润色",
              "仅返回确实需要修正的段落"
            ],
            outputSchema: {
              corrections: [
                {
                  index: 0,
                  type: "heading|abstract|keywords|reference|body|skipped",
                  selected: false,
                  skipReason: "原因或 null",
                  outlinePath: "所属大纲标题",
                  riskLevel: "low|medium|high"
                }
              ]
            },
            paragraphs: paragraphs.map((paragraph) => ({
              index: paragraph.index,
              text: paragraph.text,
              type: paragraph.type,
              selected: paragraph.selected,
              skipReason: paragraph.skipReason,
              outlinePath: paragraph.outlinePath,
              riskLevel: paragraph.riskLevel
            }))
          })
        }
      ]
    });

    const parsed = parseJsonObject(completion.choices[0]?.message.content ?? "");
    return Array.isArray(parsed?.corrections)
      ? parsed.corrections.filter(isStructureReviewCorrection)
      : [];
  }
}

function lockParagraph(
  paragraph: ParsedParagraph,
  override: Pick<ParsedParagraph, "type" | "skipReason" | "riskLevel"> & Partial<Pick<ParsedParagraph, "outlinePath">>
) {
  return {
    ...paragraph,
    type: override.type,
    selected: false,
    skipReason: override.skipReason,
    riskLevel: override.riskLevel,
    outlinePath: override.outlinePath ?? paragraph.outlinePath
  };
}

function isStructureReviewCorrection(value: unknown): value is StructureReviewCorrection {
  if (!value || typeof value !== "object") return false;
  return Number.isInteger((value as StructureReviewCorrection).index);
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
