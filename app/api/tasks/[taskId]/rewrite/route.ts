import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rewriteParagraphWithQualityPipeline } from "@/lib/rewrite/quality-pipeline";

export async function POST(_request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const task = await prisma.paperTask.findUnique({
    where: { id: taskId },
    include: { paragraphs: { orderBy: { index: "asc" } } }
  });
  if (!task) return NextResponse.json({ error: "任务不存在" }, { status: 404 });

  await prisma.paperTask.update({
    where: { id: taskId },
    data: { status: "rewriting", progress: 55 }
  });

  const selected = task.paragraphs.filter((paragraph) => paragraph.selected);
  for (const paragraph of selected) {
    const result = await rewriteParagraphWithQualityPipeline({
      text: paragraph.originalText,
      numberingPrefix: paragraph.numberingPrefix,
      citationCount: paragraph.citationCount
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
  }

  const updated = await prisma.paperTask.update({
    where: { id: taskId },
    data: { status: "exporting", progress: 80 },
    include: { paragraphs: { orderBy: { index: "asc" } } }
  });

  return NextResponse.json(updated);
}
