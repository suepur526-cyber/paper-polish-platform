import { describe, expect, it } from "vitest";
import {
  buildOutlineSections,
  canSelectParagraph,
  countReviewStats,
  getParagraphsForSection
} from "@/lib/review/outline";

const paragraphs = [
  {
    id: "p1",
    index: 0,
    type: "abstract",
    outlinePath: "段落 1",
    originalText: "摘要：人工智能辅助教学正在改变学生学习方式。",
    selected: true,
    status: "selected",
    skipReason: null,
    riskLevel: "low",
    citationCount: 0,
    numberingPrefix: null
  },
  {
    id: "p2",
    index: 1,
    type: "keywords",
    outlinePath: "段落 2",
    originalText: "关键词：人工智能；教学",
    selected: false,
    status: "skipped",
    skipReason: "关键词行需在摘要润色后确认更新",
    riskLevel: "medium",
    citationCount: 0,
    numberingPrefix: null
  },
  {
    id: "p3",
    index: 2,
    type: "heading",
    outlinePath: "第一章 绪论",
    originalText: "第一章 绪论",
    selected: false,
    status: "skipped",
    skipReason: "标题默认跳过",
    riskLevel: "medium",
    citationCount: 0,
    numberingPrefix: null
  },
  {
    id: "p4",
    index: 3,
    type: "body",
    outlinePath: "段落 4",
    originalText: "（1）研究背景。人工智能工具被广泛用于课堂管理[1]。",
    selected: true,
    status: "selected",
    skipReason: null,
    riskLevel: "low",
    citationCount: 1,
    numberingPrefix: "（1）"
  },
  {
    id: "p5",
    index: 4,
    type: "body",
    outlinePath: "段落 5",
    originalText: "研究意义体现在理论和实践两个层面。",
    selected: false,
    status: "selected",
    skipReason: null,
    riskLevel: "low",
    citationCount: 0,
    numberingPrefix: null
  },
  {
    id: "p6",
    index: 5,
    type: "heading",
    outlinePath: "参考文献",
    originalText: "参考文献",
    selected: false,
    status: "skipped",
    skipReason: "参考文献或目录内容默认跳过",
    riskLevel: "medium",
    citationCount: 0,
    numberingPrefix: null
  }
] as const;

describe("outline review helpers", () => {
  it("groups paragraphs under intro and heading sections", () => {
    const sections = buildOutlineSections(paragraphs);

    expect(sections).toMatchObject([
      { id: "intro", title: "未分章节", paragraphIds: ["p1", "p2"], selectedCount: 1 },
      { id: "p3", title: "第一章 绪论", paragraphIds: ["p3", "p4", "p5"], selectedCount: 1 },
      { id: "p6", title: "参考文献", paragraphIds: ["p6"], selectedCount: 0 }
    ]);
  });

  it("filters paragraphs for a selected section", () => {
    const sections = buildOutlineSections(paragraphs);
    const visible = getParagraphsForSection(paragraphs, sections[1].id);

    expect(visible.map((paragraph) => paragraph.id)).toEqual(["p3", "p4", "p5"]);
  });

  it("allows only body and abstract paragraphs to be selected", () => {
    expect(canSelectParagraph({ type: "body" })).toBe(true);
    expect(canSelectParagraph({ type: "abstract" })).toBe(true);
    expect(canSelectParagraph({ type: "heading" })).toBe(false);
    expect(canSelectParagraph({ type: "keywords" })).toBe(false);
    expect(canSelectParagraph({ type: "reference" })).toBe(false);
    expect(canSelectParagraph({ type: "skipped" })).toBe(false);
  });

  it("counts review statistics", () => {
    expect(countReviewStats(paragraphs)).toEqual({
      total: 6,
      selected: 2,
      skipped: 3,
      manualDecision: 0,
      selectable: 3
    });
  });
});
