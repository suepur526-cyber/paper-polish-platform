import { NextResponse } from "next/server";
import { createPaperTask } from "@/lib/tasks";

export async function POST(request: Request) {
  const formData = await request.formData();
  const pickupCode = formData.get("pickupCode");
  const file = formData.get("file");

  if (typeof pickupCode !== "string" || !pickupCode.trim() || !(file instanceof File)) {
    return NextResponse.json({ error: "缺少取件码或文件" }, { status: 400 });
  }

  try {
    const task = await createPaperTask({
      pickupCode: pickupCode.trim(),
      fileName: file.name,
      bytes: await file.arrayBuffer()
    });

    return NextResponse.json(task);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "上传失败" },
      { status: 400 }
    );
  }
}
