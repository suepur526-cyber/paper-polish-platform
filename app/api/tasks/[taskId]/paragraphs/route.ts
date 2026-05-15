import { NextResponse } from "next/server";
import { z } from "zod";
import { updateTaskParagraphSelections } from "@/lib/review/selections";

const selectionSchema = z.object({
  selections: z.array(
    z.object({
      id: z.string().min(1),
      selected: z.boolean()
    })
  )
});

export async function PATCH(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const parsed = selectionSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "选择数据格式不正确" }, { status: 400 });
  }

  const task = await updateTaskParagraphSelections(taskId, parsed.data.selections);
  if (!task) return NextResponse.json({ error: "任务不存在" }, { status: 404 });

  return NextResponse.json(task);
}
