import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("expired task cleanup", () => {
  it("deletes expired task records and task files", async () => {
    process.env.DATABASE_URL = `file:${path.join(process.cwd(), "prisma", "dev.db")}`;
    const { cleanupExpiredPickupCodes } = await import("@/lib/cleanup");
    const { prisma } = await import("@/lib/db");
    const taskId = `cleanup-${Date.now()}`;
    const taskDir = path.join(process.cwd(), "storage", "tasks", taskId);
    await mkdir(taskDir, { recursive: true });
    await writeFile(path.join(taskDir, "paper.docx"), "old file");

    const pickupCode = await prisma.pickupCode.create({
      data: {
        code: `CL${Date.now().toString().slice(-6)}`,
        expiresAt: new Date("2026-05-01T00:00:00.000Z"),
        tasks: {
          create: {
            id: taskId,
            originalName: "paper.docx",
            originalPath: path.join("storage", "tasks", taskId, "paper.docx"),
            status: "uploaded",
            progress: 5,
            paragraphs: {
              create: {
                outlinePath: "正文",
                index: 0,
                type: "body",
                originalText: "正文内容",
                selected: true,
                status: "selected",
                riskLevel: "low"
              }
            }
          }
        }
      }
    });

    const result = await cleanupExpiredPickupCodes(new Date("2026-05-03T00:00:00.000Z"));

    expect(result.expiredPickupCodes).toBeGreaterThanOrEqual(1);
    expect(result.deletedTasks).toContain(taskId);
    await expect(prisma.pickupCode.findUnique({ where: { id: pickupCode.id } })).resolves.toBeNull();
    await expect(stat(taskDir)).rejects.toThrow();
  });
});
