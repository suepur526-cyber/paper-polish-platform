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

export async function cleanupExpiredPickupCodes(now = new Date()) {
  const expiredPickupCodes = await prisma.pickupCode.findMany({
    where: {
      expiresAt: { lte: now },
      deletedAt: null
    },
    include: { tasks: { select: { id: true } } }
  });

  const deletedTasks = expiredPickupCodes.flatMap((pickupCode) =>
    pickupCode.tasks.map((task) => task.id)
  );

  for (const taskId of deletedTasks) {
    await removeTaskFiles(taskId);
  }

  if (deletedTasks.length > 0) {
    await prisma.paragraphRecord.deleteMany({
      where: { taskId: { in: deletedTasks } }
    });
    await prisma.paperTask.deleteMany({
      where: { id: { in: deletedTasks } }
    });
  }

  const expiredIds = expiredPickupCodes.map((pickupCode) => pickupCode.id);
  if (expiredIds.length > 0) {
    await prisma.pickupCode.deleteMany({
      where: { id: { in: expiredIds } }
    });
  }

  return {
    expiredPickupCodes: expiredIds.length,
    deletedTasks
  };
}
