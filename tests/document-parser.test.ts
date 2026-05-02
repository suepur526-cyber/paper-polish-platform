import { describe, expect, it } from "vitest";
import {
  classifyParagraph,
  detectNumberingPrefix,
  isLikelyHeading,
  isTocEntry,
  shouldSkipParagraph
} from "@/lib/document/classifier";

describe("document classifier", () => {
  it("skips headings", () => {
    const result = classifyParagraph({ text: "第一章 绪论", styleName: "Heading 1", index: 0 });
    expect(result.type).toBe("heading");
    expect(result.selected).toBe(false);
  });

  it("selects body paragraphs", () => {
    const result = classifyParagraph({
      text: "数字化转型在企业管理中发挥着重要作用，并逐渐影响组织结构。",
      styleName: "Normal",
      index: 3
    });
    expect(result.type).toBe("body");
    expect(result.selected).toBe(true);
  });

  it("detects protected numbering prefix", () => {
    expect(detectNumberingPrefix("（1）研究对象具有代表性。")).toBe("（1）");
  });

  it("skips references", () => {
    expect(shouldSkipParagraph("参考文献")).toBe("参考文献默认跳过");
  });

  it("skips real-paper cover and declaration metadata", () => {
    const examples = [
      "本科毕业论文（设计）",
      "学院名称：计算机学院",
      "毕业论文原创性声明",
      "论文作者（签名）： 指导教师确认（签名）：",
      "2026年5月3日"
    ];

    for (const text of examples) {
      const result = classifyParagraph({ text, index: 0, phase: "frontMatter" });
      expect(result.selected).toBe(false);
      expect(result.type).toBe("skipped");
    }
  });

  it("keeps abstract headings and keywords out of rewriting", () => {
    expect(classifyParagraph({ text: "摘    要", index: 5 }).type).toBe("heading");
    expect(
      classifyParagraph({
        text: "关键词：血细胞检测；YOLOv8；深度学习；PyQt5；OpenCV",
        index: 7,
        phase: "abstract"
      })
    ).toMatchObject({ type: "keywords", selected: false });
    expect(
      classifyParagraph({
        text: "Keywords: blood cell detection; YOLOv8; deep learning",
        index: 8,
        phase: "abstract"
      })
    ).toMatchObject({ type: "keywords", selected: false });
  });

  it("distinguishes table-of-contents entries from real headings", () => {
    expect(classifyParagraph({ text: "目 录", index: 10 })).toMatchObject({
      type: "heading",
      selected: false
    });
    expect(isTocEntry("1 引言 1")).toBe(true);
    expect(isTocEntry("1.1 研究背景及意义 2")).toBe(true);
    expect(isLikelyHeading("1 引言")).toBe(true);
    expect(isLikelyHeading("1.1 研究背景及意义")).toBe(true);
  });

  it("does not turn chapter summary sentences into headings", () => {
    expect(isLikelyHeading("第一章主要对系统研究背景、研究意义以及相关内容进行了说明。")).toBe(
      false
    );
    expect(
      classifyParagraph({
        text: "人工智能技术在临床医学领域应用广泛，为血细胞检测提供了新的技术路径。",
        index: 20,
        phase: "body"
      })
    ).toMatchObject({ type: "body", selected: true });
  });
});
