import { rm } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { storageRoot } from "@/lib/files";

export async function markExpiredPickupCodes(now = new Date()) {
  return prisma.pickupCode.updateMany({
    where: {
      expiresAt: { lte: now },
      deletedAt: null
    },
    data: {
      deletedAt: now
    }
  });
}

export async function removeTaskFiles(taskId: string) {
  const taskDir = path.join(storageRoot, "tasks", taskId);
  await rm(taskDir, { recursive: true, force: true });
}
