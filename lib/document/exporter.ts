import type { ParagraphRecord, PaperTask } from "@prisma/client";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { writeTaskFile } from "@/lib/files";

type TaskWithParagraphs = PaperTask & { paragraphs: ParagraphRecord[] };

export async function exportTaskFiles(task: TaskWithParagraphs) {
  const doc = new Document({
    sections: [
      {
        children: task.paragraphs.map((paragraph) => {
          const text = paragraph.rewrittenText ?? paragraph.originalText;
          return new Paragraph({ children: [new TextRun(text)] });
        })
      }
    ]
  });

  const docxBuffer = await Packer.toBuffer(doc);
  const exportDocxPath = await writeTaskFile(task.id, "polished.docx", docxBuffer);
  const reportPath = await writeTaskFile(
    task.id,
    "report.json",
    JSON.stringify(buildReport(task), null, 2)
  );
  const comparisonPath = await writeTaskFile(task.id, "comparison.csv", buildComparisonCsv(task));

  return { exportDocxPath, reportPath, comparisonPath };
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
