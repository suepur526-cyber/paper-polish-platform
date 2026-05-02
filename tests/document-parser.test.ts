import { describe, expect, it } from "vitest";
import {
  classifyParagraph,
  detectNumberingPrefix,
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
    expect(shouldSkipParagraph("参考文献")).toBe("参考文献或目录内容默认跳过");
  });
});
