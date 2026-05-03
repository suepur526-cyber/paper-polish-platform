import { describe, expect, it } from "vitest";
import {
  buildOutlineSections,
  buildOutlineTree,
  canSelectParagraph,
  collectAncestorSectionIds,
  countReviewStats,
  getOutlineLevel,
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

  it("keeps hidden table-of-contents entries out of visible outline sections", () => {
    const sections = buildOutlineSections([
      {
        id: "abstract-heading",
        index: 0,
        type: "heading",
        outlinePath: "摘 要",
        originalText: "摘 要",
        selected: false,
        status: "skipped",
        skipReason: "标题默认跳过",
        riskLevel: "medium",
        citationCount: 0,
        numberingPrefix: null
      },
      {
        id: "abstract-body",
        index: 1,
        type: "abstract",
        outlinePath: "摘 要",
        originalText: "本文设计了一套系统。",
        selected: true,
        status: "selected",
        skipReason: null,
        riskLevel: "low",
        citationCount: 0,
        numberingPrefix: null
      },
      {
        id: "toc-heading",
        index: 2,
        type: "heading",
        outlinePath: "目 录",
        originalText: "目 录",
        selected: false,
        status: "skipped",
        skipReason: "目录标题默认跳过",
        riskLevel: "medium",
        citationCount: 0,
        numberingPrefix: null
      },
      {
        id: "toc-entry",
        index: 3,
        type: "skipped",
        outlinePath: "目 录",
        originalText: "1 引言 1",
        selected: false,
        status: "skipped",
        skipReason: "目录内容默认跳过",
        riskLevel: "medium",
        citationCount: 0,
        numberingPrefix: null
      },
      {
        id: "body-heading",
        index: 4,
        type: "heading",
        outlinePath: "1 引言",
        originalText: "1 引言",
        selected: false,
        status: "skipped",
        skipReason: "标题默认跳过",
        riskLevel: "medium",
        citationCount: 0,
        numberingPrefix: null
      }
    ]);

    expect(sections.map((section) => section.title)).toEqual(["摘 要", "1 引言"]);
    expect(sections[0].paragraphIds).toEqual(["abstract-heading", "abstract-body"]);
    expect(sections[1].paragraphIds).toEqual(["body-heading"]);
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

  it("derives outline levels from heading numbers", () => {
    expect(getOutlineLevel("未分章节")).toBe(0);
    expect(getOutlineLevel("1 引言")).toBe(1);
    expect(getOutlineLevel("1.2 国内外研究现状")).toBe(2);
    expect(getOutlineLevel("1.2.1 国内研究现状")).toBe(3);
    expect(getOutlineLevel("第一章 绪论")).toBe(1);
    expect(getOutlineLevel("第一节 研究背景")).toBe(2);
  });

  it("builds nested outline tree from heading levels", () => {
    const sections = [
      { id: "intro", title: "未分章节", level: 0, paragraphIds: [], totalCount: 1, selectedCount: 0, skippedCount: 1 },
      { id: "one", title: "1 引言", level: 1, paragraphIds: [], totalCount: 3, selectedCount: 1, skippedCount: 1 },
      { id: "one-two", title: "1.2 国内外研究现状", level: 2, paragraphIds: [], totalCount: 1, selectedCount: 0, skippedCount: 1 },
      { id: "one-two-one", title: "1.2.1 国内研究现状", level: 3, paragraphIds: [], totalCount: 3, selectedCount: 2, skippedCount: 1 },
      { id: "two", title: "2 理论与技术基础", level: 1, paragraphIds: [], totalCount: 1, selectedCount: 0, skippedCount: 1 }
    ];

    const tree = buildOutlineTree(sections);

    expect(tree.map((node) => node.id)).toEqual(["intro", "one", "two"]);
    expect(tree[1].children.map((node) => node.id)).toEqual(["one-two"]);
    expect(tree[1].children[0].children.map((node) => node.id)).toEqual(["one-two-one"]);
  });

  it("collects ancestor section ids for active tree nodes", () => {
    const tree = buildOutlineTree([
      { id: "one", title: "1 引言", level: 1, paragraphIds: [], totalCount: 3, selectedCount: 1, skippedCount: 1 },
      { id: "one-two", title: "1.2 国内外研究现状", level: 2, paragraphIds: [], totalCount: 1, selectedCount: 0, skippedCount: 1 },
      { id: "one-two-one", title: "1.2.1 国内研究现状", level: 3, paragraphIds: [], totalCount: 3, selectedCount: 2, skippedCount: 1 }
    ]);

    expect(collectAncestorSectionIds(tree, "one-two-one")).toEqual(["one", "one-two"]);
    expect(collectAncestorSectionIds(tree, "one")).toEqual([]);
    expect(collectAncestorSectionIds(tree, "missing")).toEqual([]);
  });
});
