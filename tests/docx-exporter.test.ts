import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { Document, Packer, Paragraph, TextRun } from "docx";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { buildFormatPreservingDocx } from "@/lib/document/exporter";

describe("format-preserving DOCX exporter", () => {
  it("updates rewritten paragraph text inside the original DOCX package", async () => {
    const taskId = `export-test-${Date.now()}`;
    const taskDir = path.join(process.cwd(), "storage", "tasks", taskId);
    await mkdir(taskDir, { recursive: true });

    try {
      const source = await Packer.toBuffer(
        new Document({
          sections: [
            {
              children: [
                new Paragraph({ children: [new TextRun({ text: "保持标题", bold: true })] }),
                new Paragraph({
                  children: [
                    new TextRun("原始"),
                    new TextRun({ text: "正文", italics: true })
                  ]
                })
              ]
            }
          ]
        })
      );
      await writeFile(path.join(taskDir, "source.docx"), source);

      const exported = await buildFormatPreservingDocx({
        id: taskId,
        pickupCodeId: "pickup",
        originalName: "source.docx",
        originalPath: path.join("storage", "tasks", taskId, "source.docx"),
        workingDocxPath: path.join("storage", "tasks", taskId, "source.docx"),
        status: "exporting",
        progress: 80,
        errorMessage: null,
        reportPath: null,
        comparisonPath: null,
        exportDocxPath: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        paragraphs: [
          {
            id: "p0",
            taskId,
            outlinePath: "保持标题",
            index: 0,
            type: "heading",
            originalText: "保持标题",
            rewrittenText: null,
            selected: false,
            status: "skipped",
            skipReason: "标题默认跳过",
            riskLevel: "medium",
            citationCount: 0,
            numberingPrefix: null,
            retryCount: 0,
            validationJson: null
          },
          {
            id: "p1",
            taskId,
            outlinePath: "保持标题",
            index: 1,
            type: "body",
            originalText: "原始正文",
            rewrittenText: "润色正文",
            selected: true,
            status: "validated",
            skipReason: null,
            riskLevel: "low",
            citationCount: 0,
            numberingPrefix: null,
            retryCount: 0,
            validationJson: null
          }
        ]
      });

      const zip = await JSZip.loadAsync(exported);
      const xml = await zip.file("word/document.xml")?.async("string");

      expect(xml).toContain("保持标题");
      expect(xml).toContain("润色正文");
      expect(xml).not.toContain("原始正文");
      expect(xml).toContain("<w:b");
      expect(xml).toContain("<w:i");
      expect(await readFile(path.join(taskDir, "source.docx"))).toEqual(source);
    } finally {
      await rm(taskDir, { recursive: true, force: true });
    }
  });
});
