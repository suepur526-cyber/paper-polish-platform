import { describe, expect, it } from "vitest";
import {
  applyStructureReviewCorrections,
  enforceStructureGuardrails,
  reviewDocumentStructure,
  type DocumentStructureReviewer
} from "@/lib/document/structure-reviewer";
import type { ParsedParagraph } from "@/lib/document/parser";

function paragraph(overrides: Partial<ParsedParagraph> & Pick<ParsedParagraph, "index" | "text">): ParsedParagraph {
  return {
    outlinePath: "5.4 测试总结",
    index: overrides.index,
    text: overrides.text,
    type: "body",
    selected: true,
    skipReason: null,
    riskLevel: "low",
    citationCount: 0,
    numberingPrefix: null,
    ...overrides
  };
}

describe("document structure reviewer", () => {
  it("applies model corrections for structure review", () => {
    const reviewed = applyStructureReviewCorrections(
      [
        paragraph({ index: 10, text: "图3-1 系统整体用例图" }),
        paragraph({ index: 11, text: "正文内容保持不变。" })
      ],
      [
        {
          index: 10,
          type: "skipped",
          selected: false,
          skipReason: "图表题注默认跳过",
          outlinePath: "3.2.2 功能需求分析",
          riskLevel: "medium"
        }
      ]
    );

    expect(reviewed[0]).toMatchObject({
      type: "skipped",
      selected: false,
      skipReason: "图表题注默认跳过",
      outlinePath: "3.2.2 功能需求分析",
      riskLevel: "medium"
    });
    expect(reviewed[1]).toMatchObject({ type: "body", selected: true });
  });

  it("keeps hard guardrails after model review", async () => {
    const reviewer: DocumentStructureReviewer = {
      async reviewParagraphs() {
        return [
          { index: 1, type: "body", selected: true, skipReason: null },
          { index: 2, type: "body", selected: true, skipReason: null }
        ];
      }
    };

    const reviewed = await reviewDocumentStructure(
      [
        paragraph({ index: 1, text: "图3-1 系统整体用例图" }),
        paragraph({ index: 2, text: "参考文献", outlinePath: "参考文献", type: "reference", selected: false })
      ],
      reviewer
    );

    expect(reviewed[0]).toMatchObject({
      type: "skipped",
      selected: false,
      skipReason: "图表题注默认跳过"
    });
    expect(reviewed[1]).toMatchObject({
      type: "reference",
      selected: false,
      skipReason: "参考文献默认跳过",
      outlinePath: "参考文献"
    });
  });

  it("locks contents and acknowledgements even without a model", () => {
    const guarded = enforceStructureGuardrails([
      paragraph({ index: 1, text: "目 录", outlinePath: "目 录", type: "heading", selected: false }),
      paragraph({ index: 2, text: "1 绪论 1", outlinePath: "目 录", type: "skipped", selected: false }),
      paragraph({ index: 3, text: "致 谢", outlinePath: "致 谢", type: "skipped", selected: false })
    ]);

    expect(guarded[0]).toMatchObject({ type: "heading", selected: false, outlinePath: "目 录" });
    expect(guarded[1]).toMatchObject({ type: "skipped", selected: false, outlinePath: "目 录" });
    expect(guarded[2]).toMatchObject({ type: "skipped", selected: false, outlinePath: "致 谢" });
  });
});
