import { describe, expect, it } from "vitest";
import { detectProtectedTermsForParagraphs } from "@/lib/rewrite/protection-detection";
import type { ParsedParagraph } from "@/lib/document/parser";
import type { RewriteModelAdapter } from "@/lib/rewrite/model-adapter";

function paragraph(index: number, text: string, selected = true): ParsedParagraph {
  return {
    index,
    text,
    outlinePath: "Functional requirements",
    type: selected ? "body" : "skipped",
    selected,
    skipReason: selected ? null : "Skipped",
    riskLevel: "low",
    citationCount: 0,
    numberingPrefix: null
  };
}

describe("model protection detection", () => {
  it("uses one model batch for selected paragraphs and expands short numbering terms", async () => {
    const calls: string[][] = [];
    const adapter: RewriteModelAdapter = {
      async detectProtectedTermsBatch(texts) {
        calls.push(texts);
        return texts.map((text) => (text.startsWith("(6)") ? ["(6)"] : []));
      },
      async createCandidates() {
        return [];
      },
      async chooseBestCandidate(original) {
        return original;
      }
    };

    const result = await detectProtectedTermsForParagraphs(
      [
        paragraph(1, "(6) Live monitoring shows patient detection progress."),
        paragraph(2, "Figure 3-1 System flow chart", false)
      ],
      adapter
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual(["(6) Live monitoring shows patient detection progress."]);
    expect(result.get(1)).toEqual(["(6)"]);
    expect(result.has(2)).toBe(false);
  });

  it("does not block parsing with single paragraph checks when a batch is empty", async () => {
    const batchCalls: number[] = [];
    const singleCalls: string[] = [];
    const adapter: RewriteModelAdapter = {
      async detectProtectedTermsBatch(texts) {
        batchCalls.push(texts.length);
        return texts.map(() => []);
      },
      async detectProtectedTerms(text) {
        singleCalls.push(text);
        return [text.slice(0, 3)];
      },
      async createCandidates() {
        return [];
      },
      async chooseBestCandidate(original) {
        return original;
      }
    };

    const result = await detectProtectedTermsForParagraphs(
      [
        paragraph(1, "Spring Boot supports booking management."),
        paragraph(2, "Vue renders the statistics dashboard.")
      ],
      adapter
    );

    expect(batchCalls).toEqual([2]);
    expect(singleCalls).toEqual([]);
    expect(result.size).toBe(0);
  });
});
