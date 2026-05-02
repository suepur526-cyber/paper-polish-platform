import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const fileConfig = {
  docx: {
    field: "exportDocxPath",
    fileName: "polished.docx",
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  },
  report: {
    field: "reportPath",
    fileName: "report.json",
    contentType: "application/json; charset=utf-8"
  },
  comparison: {
    field: "comparisonPath",
    fileName: "comparison.csv",
    contentType: "text/csv; charset=utf-8"
  }
} as const;

export async function GET(
  _request: Request,
  context: { params: Promise<{ taskId: string; kind: string }> }
) {
  const { taskId, kind } = await context.params;
  const config = fileConfig[kind as keyof typeof fileConfig];
  if (!config) return NextResponse.json({ error: "文件类型不存在" }, { status: 404 });

  const task = await prisma.paperTask.findUnique({ where: { id: taskId } });
  if (!task) return NextResponse.json({ error: "任务不存在" }, { status: 404 });

  const relativePath = task[config.field];
  if (!relativePath) return NextResponse.json({ error: "文件尚未生成" }, { status: 404 });

  const absolutePath = path.join(process.cwd(), relativePath);
  const content = await readFile(absolutePath);

  return new NextResponse(content, {
    headers: {
      "content-type": config.contentType,
      "content-disposition": `attachment; filename="${config.fileName}"`
    }
  });
}
