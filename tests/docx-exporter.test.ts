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

  it("preserves complex Word elements while replacing only paragraph text", async () => {
    const taskId = `complex-export-test-${Date.now()}`;
    const taskDir = path.join(process.cwd(), "storage", "tasks", taskId);
    await mkdir(taskDir, { recursive: true });

    try {
      const source = await buildComplexDocxFixture();
      await writeFile(path.join(taskDir, "complex.docx"), source);

      const exported = await buildFormatPreservingDocx({
        id: taskId,
        pickupCodeId: "pickup",
        originalName: "complex.docx",
        originalPath: path.join("storage", "tasks", taskId, "complex.docx"),
        workingDocxPath: path.join("storage", "tasks", taskId, "complex.docx"),
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
            outlinePath: "正文",
            index: 0,
            type: "body",
            originalText: "正文",
            rewrittenText: "润色后的正文",
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
      const footnotes = await zip.file("word/footnotes.xml")?.async("string");
      const endnotes = await zip.file("word/endnotes.xml")?.async("string");
      const comments = await zip.file("word/comments.xml")?.async("string");

      expect(xml).toContain("润色后的正文");
      expect(xml).toContain("<w:footnoteReference");
      expect(xml).toContain("<w:endnoteReference");
      expect(xml).toContain("<w:commentRangeStart");
      expect(xml).toContain("<w:fldChar");
      expect(xml).toContain("<m:oMath");
      expect(xml).toContain("<w:vertAlign");
      expect(footnotes).toContain("脚注内容");
      expect(endnotes).toContain("尾注内容");
      expect(comments).toContain("批注内容");
    } finally {
      await rm(taskDir, { recursive: true, force: true });
    }
  });
});

async function buildComplexDocxFixture() {
  const base = await Packer.toBuffer(
    new Document({
      sections: [{ children: [new Paragraph({ children: [new TextRun("正文")] })] }]
    })
  );
  const zip = await JSZip.loadAsync(base);
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
  <w:body>
    <w:p>
      <w:commentRangeStart w:id="0"/>
      <w:r><w:t>正文</w:t></w:r>
      <w:r><w:footnoteReference w:id="2"/></w:r>
      <w:r><w:endnoteReference w:id="2"/></w:r>
      <w:r><w:fldChar w:fldCharType="begin"/></w:r>
      <w:r><w:instrText> REF _Ref12345 \\h </w:instrText></w:r>
      <w:r><w:fldChar w:fldCharType="end"/></w:r>
      <m:oMath><m:r><m:t>x+y</m:t></m:r></m:oMath>
      <w:r><w:rPr><w:vertAlign w:val="superscript"/></w:rPr><w:t>2</w:t></w:r>
      <w:commentRangeEnd w:id="0"/>
      <w:r><w:commentReference w:id="0"/></w:r>
    </w:p>
    <w:sectPr/>
  </w:body>
</w:document>`
  );
  zip.file(
    "word/footnotes.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:footnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:footnote w:id="2"><w:p><w:r><w:t>脚注内容</w:t></w:r></w:p></w:footnote>
</w:footnotes>`
  );
  zip.file(
    "word/endnotes.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:endnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:endnote w:id="2"><w:p><w:r><w:t>尾注内容</w:t></w:r></w:p></w:endnote>
</w:endnotes>`
  );
  zip.file(
    "word/comments.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:comment w:id="0" w:author="QA"><w:p><w:r><w:t>批注内容</w:t></w:r></w:p></w:comment>
</w:comments>`
  );
  return zip.generateAsync({ type: "nodebuffer" });
}
