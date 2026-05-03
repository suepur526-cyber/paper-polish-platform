import { exportTaskFiles } from "@/lib/document/exporter";
import { ensureDocxPath } from "@/lib/document/doc-converter";
import { parseDocxParagraphs } from "@/lib/document/parser";
import { reviewDocumentStructure } from "@/lib/document/structure-reviewer";
import { prisma } from "@/lib/db";
import { getRewriteModelAdapter } from "@/lib/rewrite/model-adapter";
import { detectProtectedTermsForParagraphs } from "@/lib/rewrite/protection-detection";
import { rewriteParagraphWithQualityPipeline } from "@/lib/rewrite/quality-pipeline";

export async function runOutlineTask(taskId: string) {
  const task = await prisma.paperTask.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task does not exist");

  try {
    await prisma.paperTask.update({
      where: { id: taskId },
      data: { status: "parsing", progress: 20, errorMessage: null }
    });

    const docxPath = await ensureDocxPath(task.originalPath);
    const paragraphs = await reviewDocumentStructure(await parseDocxParagraphs(docxPath));
    const modelProtectedTermsByIndex = await detectProtectedTermsForParagraphs(
      paragraphs,
      getRewriteModelAdapter()
    );

    await prisma.paragraphRecord.deleteMany({ where: { taskId } });
    await prisma.paragraphRecord.createMany({
      data: paragraphs.map((paragraph) => ({
        taskId,
        outlinePath: paragraph.outlinePath,
        index: paragraph.index,
        type: paragraph.type,
        originalText: paragraph.text,
        selected: paragraph.selected,
        status: paragraph.selected ? "selected" : "skipped",
        skipReason: paragraph.skipReason,
        riskLevel: paragraph.riskLevel,
        citationCount: paragraph.citationCount,
        numberingPrefix: paragraph.numberingPrefix,
        validationJson: JSON.stringify({
          protectedTerms: modelProtectedTermsByIndex.get(paragraph.index) ?? [],
          protectionSource: modelProtectedTermsByIndex.has(paragraph.index) ? "model" : "rules"
        })
      }))
    });

    await prisma.paperTask.update({
      where: { id: taskId },
      data: { workingDocxPath: docxPath, status: "awaiting_review", progress: 40 }
    });
  } catch (error) {
    await markTaskFailed(taskId, error, "解析失败");
  }
}

export async function runRewriteTask(taskId: string) {
  const task = await prisma.paperTask.findUnique({
    where: { id: taskId },
    include: { paragraphs: { orderBy: { index: "asc" } } }
  });
  if (!task) throw new Error("Task does not exist");

  try {
    await prisma.paperTask.update({
      where: { id: taskId },
      data: { status: "rewriting", progress: 55, errorMessage: null }
    });

    const selected = task.paragraphs.filter((paragraph) => paragraph.selected);
    for (let index = 0; index < selected.length; index += 1) {
      const paragraph = selected[index];
      const result = await rewriteParagraphWithQualityPipeline({
        text: paragraph.originalText,
        numberingPrefix: paragraph.numberingPrefix,
        citationCount: paragraph.citationCount,
        modelProtectedTerms: readModelProtectedTerms(paragraph.validationJson)
      });

      await prisma.paragraphRecord.update({
        where: { id: paragraph.id },
        data: {
          rewrittenText: result.rewrittenText,
          status: result.status,
          retryCount: result.retryCount,
          validationJson: JSON.stringify(result.validation)
        }
      });

      const progress = 55 + Math.floor(((index + 1) / Math.max(selected.length, 1)) * 25);
      await prisma.paperTask.update({
        where: { id: taskId },
        data: { progress: Math.min(progress, 80) }
      });
    }

    await prisma.paperTask.update({
      where: { id: taskId },
      data: { status: "exporting", progress: 82 }
    });
    await runExportTask(taskId);
  } catch (error) {
    await markTaskFailed(taskId, error, "润色失败");
  }
}

export async function runExportTask(taskId: string) {
  const task = await prisma.paperTask.findUnique({
    where: { id: taskId },
    include: { paragraphs: { orderBy: { index: "asc" } } }
  });
  if (!task) throw new Error("Task does not exist");

  try {
    await prisma.paperTask.update({
      where: { id: taskId },
      data: { status: "exporting", progress: Math.max(task.progress, 82), errorMessage: null }
    });
    const exportTask = await prisma.paperTask.findUnique({
      where: { id: taskId },
      include: { paragraphs: { orderBy: { index: "asc" } } }
    });
    if (!exportTask) throw new Error("Task does not exist");

    const paths = await exportTaskFiles(exportTask);
    await prisma.paperTask.update({
      where: { id: taskId },
      data: {
        ...paths,
        status: "completed",
        progress: 100
      }
    });
  } catch (error) {
    await markTaskFailed(taskId, error, "导出失败");
  }
}

function readModelProtectedTerms(validationJson: string | null) {
  if (!validationJson) return [];
  try {
    const parsed = JSON.parse(validationJson) as { protectedTerms?: unknown };
    return Array.isArray(parsed.protectedTerms)
      ? parsed.protectedTerms.filter((term): term is string => typeof term === "string")
      : [];
  } catch {
    return [];
  }
}

async function markTaskFailed(taskId: string, error: unknown, fallbackMessage: string) {
  await prisma.paperTask.update({
    where: { id: taskId },
    data: {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : fallbackMessage
    }
  });
}
