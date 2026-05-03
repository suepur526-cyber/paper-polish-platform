import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureDocxPath } from "@/lib/document/doc-converter";
import { parseDocxParagraphs } from "@/lib/document/parser";
import { reviewDocumentStructure } from "@/lib/document/structure-reviewer";
import { getRewriteModelAdapter } from "@/lib/rewrite/model-adapter";
import { expandProtectedTerms } from "@/lib/rewrite/protected-elements";

export async function POST(_request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const task = await prisma.paperTask.findUnique({ where: { id: taskId } });
  if (!task) return NextResponse.json({ error: "任务不存在" }, { status: 404 });

  try {
    await prisma.paperTask.update({
      where: { id: taskId },
      data: { status: "parsing", progress: 20 }
    });

    const docxPath = await ensureDocxPath(task.originalPath);
    const paragraphs = await reviewDocumentStructure(await parseDocxParagraphs(docxPath));
    const modelProtectedTermsByIndex = await detectReviewModelProtectedTerms(paragraphs);

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

    const updated = await prisma.paperTask.update({
      where: { id: taskId },
      data: { workingDocxPath: docxPath, status: "awaiting_review", progress: 40 },
      include: { paragraphs: { orderBy: { index: "asc" } } }
    });

    return NextResponse.json(updated);
  } catch (error) {
    await prisma.paperTask.update({
      where: { id: taskId },
      data: {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "解析失败"
      }
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "解析失败" },
      { status: 400 }
    );
  }
}

async function detectReviewModelProtectedTerms(paragraphs: Awaited<ReturnType<typeof reviewDocumentStructure>>) {
  const adapter = getRewriteModelAdapter();
  const byIndex = new Map<number, string[]>();
  if (!adapter?.detectProtectedTerms) return byIndex;

  for (const paragraph of paragraphs) {
    if (!paragraph.selected) continue;

    const terms = expandProtectedTerms(
      paragraph.text,
      await safeDetectProtectedTerms(adapter, paragraph.text)
    );
    if (terms.length > 0) byIndex.set(paragraph.index, terms);
  }

  return byIndex;
}

async function safeDetectProtectedTerms(
  adapter: NonNullable<ReturnType<typeof getRewriteModelAdapter>>,
  text: string
) {
  if (!adapter.detectProtectedTerms) return [];
  try {
    return await adapter.detectProtectedTerms(text);
  } catch {
    return [];
  }
}
