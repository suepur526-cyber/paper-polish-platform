import type { ParagraphRecord, PaperTask } from "@prisma/client";
import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import type { Element as XmlElement } from "@xmldom/xmldom";
import { writeTaskFile } from "@/lib/files";

type TaskWithParagraphs = PaperTask & { paragraphs: ParagraphRecord[] };

export async function exportTaskFiles(task: TaskWithParagraphs) {
  const docxBuffer = await buildFormatPreservingDocx(task);
  const exportDocxPath = await writeTaskFile(task.id, "polished.docx", docxBuffer);
  const reportPath = await writeTaskFile(
    task.id,
    "report.json",
    JSON.stringify(buildReport(task), null, 2)
  );
  const comparisonPath = await writeTaskFile(task.id, "comparison.csv", buildComparisonCsv(task));

  return { exportDocxPath, reportPath, comparisonPath };
}

export async function buildFormatPreservingDocx(task: TaskWithParagraphs) {
  const originalDocxPath = task.workingDocxPath ?? task.originalPath;
  const sourceBuffer = await readFile(path.join(process.cwd(), originalDocxPath));
  const zip = await JSZip.loadAsync(sourceBuffer);
  const documentXmlFile = zip.file("word/document.xml");
  if (!documentXmlFile) throw new Error("DOCX 主文档内容不存在");

  const documentXml = await documentXmlFile.async("string");
  const xmlDoc = new DOMParser().parseFromString(documentXml, "application/xml");
  const wordParagraphs = Array.from(xmlDoc.getElementsByTagName("w:p"));
  const replacements = new Map(
    task.paragraphs
      .filter((paragraph) => paragraph.rewrittenText)
      .map((paragraph) => [paragraph.index, paragraph.rewrittenText as string])
  );

  for (const paragraph of task.paragraphs) {
    const replacement = replacements.get(paragraph.index);
    if (!replacement) continue;
    const wordParagraph = wordParagraphs[paragraph.index];
    if (!wordParagraph) continue;
    replaceParagraphText(wordParagraph, replacement);
  }

  zip.file("word/document.xml", new XMLSerializer().serializeToString(xmlDoc));
  return zip.generateAsync({ type: "nodebuffer" });
}

function replaceParagraphText(paragraphNode: XmlElement, text: string) {
  const textNodes = Array.from(paragraphNode.getElementsByTagName("w:t"));
  if (textNodes.length === 0) return;

  const [firstNode, ...restNodes] = textNodes;
  firstNode.textContent = text;
  firstNode.setAttribute("xml:space", "preserve");
  for (const node of restNodes) {
    node.textContent = "";
  }
}

function buildReport(task: TaskWithParagraphs) {
  return {
    taskId: task.id,
    originalName: task.originalName,
    totalParagraphs: task.paragraphs.length,
    processedParagraphs: task.paragraphs.filter((paragraph) => paragraph.status === "validated")
      .length,
    skippedParagraphs: task.paragraphs.filter((paragraph) => paragraph.status === "skipped")
      .length,
    manualDecisionParagraphs: task.paragraphs.filter(
      (paragraph) => paragraph.status === "needs_manual_decision"
    ).length,
    generatedAt: new Date().toISOString()
  };
}

function csvEscape(value: string | null) {
  const safe = value ?? "";
  return `"${safe.replace(/"/g, '""')}"`;
}

function buildComparisonCsv(task: TaskWithParagraphs) {
  const rows = [["大纲路径", "类型", "状态", "原文", "润色后", "跳过原因", "重试次数"]];
  for (const paragraph of task.paragraphs) {
    rows.push([
      paragraph.outlinePath,
      paragraph.type,
      paragraph.status,
      paragraph.originalText,
      paragraph.rewrittenText ?? "",
      paragraph.skipReason ?? "",
      String(paragraph.retryCount)
    ]);
  }
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}
