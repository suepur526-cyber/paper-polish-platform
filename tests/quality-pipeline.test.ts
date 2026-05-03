import { describe, expect, it } from "vitest";
import { rewriteParagraphWithQualityPipeline } from "@/lib/rewrite/quality-pipeline";

describe("quality pipeline", () => {
  it("keeps numbering prefix", async () => {
    const result = await rewriteParagraphWithQualityPipeline({
      text: "（1）本研究依据现有理论阐述企业数字化转型的作用。",
      numberingPrefix: "（1）",
      citationCount: 0
    });

    expect(result.rewrittenText.startsWith("（1）")).toBe(true);
    expect(result.status).toBe("validated");
  });

  it("keeps chapter guide prefixes during rewriting", async () => {
    const result = await rewriteParagraphWithQualityPipeline({
      text: "第1章 绪论：主要介绍了本课题的研究背景与意义，分析了国内外研究现状。",
      numberingPrefix: null,
      citationCount: 0
    });

    expect(result.rewrittenText.startsWith("第1章 绪论：")).toBe(true);
    expect(result.validation.protectedTermsOk).toBe(true);
    expect(result.status).toBe("validated");
  });

  it("returns a valid terminal paragraph state", async () => {
    const result = await rewriteParagraphWithQualityPipeline({
      text: "短句。",
      numberingPrefix: null,
      citationCount: 0
    });

    expect(["validated", "needs_manual_decision"]).toContain(result.status);
  });
});
