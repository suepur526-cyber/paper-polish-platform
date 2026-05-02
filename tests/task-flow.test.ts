import { describe, expect, it } from "vitest";
import { isSupportedPaperFile, normalizeUploadName } from "@/lib/tasks";

describe("task upload helpers", () => {
  it("accepts doc and docx files", () => {
    expect(isSupportedPaperFile("paper.docx")).toBe(true);
    expect(isSupportedPaperFile("paper.doc")).toBe(true);
    expect(isSupportedPaperFile("paper.pdf")).toBe(false);
  });

  it("normalizes unsafe upload names", () => {
    expect(normalizeUploadName("../我的论文.docx")).toBe("我的论文.docx");
  });
});
