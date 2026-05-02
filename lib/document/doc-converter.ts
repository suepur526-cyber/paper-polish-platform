export async function ensureDocxPath(filePath: string) {
  if (filePath.toLowerCase().endsWith(".docx")) return filePath;
  throw new Error("第一版已预留 .doc 转换接口，但当前环境未配置转换器");
}
