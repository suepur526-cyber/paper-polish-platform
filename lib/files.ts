import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const storageRoot = path.join(process.cwd(), "storage");

export async function ensureTaskDir(taskId: string) {
  const taskDir = path.join(storageRoot, "tasks", taskId);
  await mkdir(taskDir, { recursive: true });
  return taskDir;
}

export async function saveUploadFile(taskId: string, fileName: string, bytes: ArrayBuffer) {
  const taskDir = await ensureTaskDir(taskId);
  const absolutePath = path.join(taskDir, fileName);

  await writeFile(absolutePath, Buffer.from(bytes));

  return path.join("storage", "tasks", taskId, fileName);
}

export async function writeTaskFile(taskId: string, fileName: string, content: string | Buffer) {
  const taskDir = await ensureTaskDir(taskId);
  const filePath = path.join(taskDir, fileName);
  await writeFile(filePath, content);
  return path.join("storage", "tasks", taskId, fileName);
}
