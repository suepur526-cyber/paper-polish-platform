import path from "node:path";
import { prisma } from "@/lib/db";
import { saveUploadFile } from "@/lib/files";
import { findActivePickupCode } from "@/lib/pickup-codes";

export function normalizeUploadName(name: string) {
  const normalized = path.basename(name).replace(/[<>:"/\\|?*]/g, "_").trim();
  return normalized || "upload";
}

export function isSupportedPaperFile(name: string) {
  const lower = name.toLowerCase();
  return lower.endsWith(".docx") || lower.endsWith(".doc");
}

export async function createPaperTask(params: {
  pickupCode: string;
  fileName: string;
  bytes: ArrayBuffer;
}) {
  const pickupCode = await findActivePickupCode(params.pickupCode.toUpperCase());
  if (!pickupCode) {
    throw new Error("取件码不存在或已过期");
  }

  const originalName = normalizeUploadName(params.fileName);
  if (!isSupportedPaperFile(originalName)) {
    throw new Error("仅支持 .doc 和 .docx 文件");
  }

  const task = await prisma.paperTask.create({
    data: {
      pickupCodeId: pickupCode.id,
      originalName,
      originalPath: "",
      status: "uploaded",
      progress: 5
    }
  });

  const originalPath = await saveUploadFile(task.id, originalName, params.bytes);

  return prisma.paperTask.update({
    where: { id: task.id },
    data: { originalPath },
    include: { paragraphs: { orderBy: { index: "asc" } } }
  });
}

export async function getTask(taskId: string) {
  return prisma.paperTask.findUnique({
    where: { id: taskId },
    include: { paragraphs: { orderBy: { index: "asc" } } }
  });
}
