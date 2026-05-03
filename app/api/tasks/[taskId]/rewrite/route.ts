import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runRewriteTask } from "@/lib/jobs/task-actions";
import { enqueueTaskJob } from "@/lib/jobs/task-runner";

export async function POST(_request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const task = await prisma.paperTask.findUnique({
    where: { id: taskId },
    include: { paragraphs: { orderBy: { index: "asc" } } }
  });
  if (!task) return NextResponse.json({ error: "任务不存在" }, { status: 404 });

  const queued = enqueueTaskJob(taskId, "rewrite", runRewriteTask);
  const updated = await prisma.paperTask.update({
    where: { id: taskId },
    data: queued.alreadyQueued
      ? {}
      : { status: "queued_rewrite", progress: Math.max(task.progress, 45), errorMessage: null },
    include: { paragraphs: { orderBy: { index: "asc" } } }
  });

  return NextResponse.json({ ...updated, jobQueued: !queued.alreadyQueued });
}
