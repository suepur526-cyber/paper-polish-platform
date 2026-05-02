import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exportTaskFiles } from "@/lib/document/exporter";

export async function POST(_request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const task = await prisma.paperTask.findUnique({
    where: { id: taskId },
    include: { paragraphs: { orderBy: { index: "asc" } } }
  });
  if (!task) return NextResponse.json({ error: "任务不存在" }, { status: 404 });

  const paths = await exportTaskFiles(task);
  const updated = await prisma.paperTask.update({
    where: { id: taskId },
    data: {
      ...paths,
      status: "completed",
      progress: 100
    },
    include: { paragraphs: { orderBy: { index: "asc" } } }
  });

  return NextResponse.json(updated);
}
