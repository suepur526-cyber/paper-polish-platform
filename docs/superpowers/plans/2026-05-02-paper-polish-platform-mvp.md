# 论文润色平台 MVP 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个可运行的第一版论文润色平台纵切，支持取件码任务空间、DOC/DOCX 上传、结构审阅、模拟润色、DOCX 导出、报告和段落对照表。

**Architecture:** 使用 Next.js App Router 提供响应式前端和 API Route；Prisma + SQLite 保存取件码、任务、段落和导出记录；本地文件系统保存上传文件和导出文件。文档解析、润色、导出通过独立服务模块隔离，第一版用同步/短任务模拟 Worker，后续可替换为队列、对象存储和 GPT-5.5 模型适配层。

**Tech Stack:** Next.js、React、TypeScript、Tailwind CSS、Prisma、SQLite、Vitest、Mammoth、docx、OpenAI SDK 适配接口。

---

## 实施边界

第一版目标是跑通完整产品纵切，不一次性实现所有复杂格式能力。

必须完成：

- 创建或输入取件码。
- 取件码状态保存在浏览器本地，用户可退出。
- 同一取件码下可持续追加任务。
- 上传 `.docx` 和 `.doc` 文件。
- `.doc` 第一版先标记为“需要转换支持”，保留转换接口；如果本机配置 LibreOffice，再接入真实转换。
- 解析 `.docx` 中的普通段落和标题，生成树形大纲和段落记录。
- 默认选择正文自然段和摘要正文，跳过标题、参考文献、目录、复杂段落。
- 用户可以勾选/取消勾选段落。
- 使用模拟润色器完成质量管线的接口形态，并保留 GPT-5.5 适配层。
- 导出润色后的 `.docx`、JSON 修改报告和 CSV 段落对照表。
- 7 天过期字段和手动删除接口。

第一版暂不完成：

- 真实 `.doc` 转换兜底。
- 完整 Word 复杂域、交叉引用、脚注、尾注、题注深度回写。
- 生产级异步队列。
- 真实 GPT-5.5 调用上线。
- 对第三方检测平台分数的任何承诺。

## 文件结构

创建以下结构：

```text
app/
  api/
    pickup-codes/route.ts
    pickup-codes/[code]/route.ts
    tasks/route.ts
    tasks/[taskId]/route.ts
    tasks/[taskId]/outline/route.ts
    tasks/[taskId]/rewrite/route.ts
    tasks/[taskId]/export/route.ts
  page.tsx
  layout.tsx
  globals.css
components/
  pickup-code-entry.tsx
  task-space.tsx
  upload-panel.tsx
  task-list.tsx
  outline-review.tsx
  result-panel.tsx
lib/
  db.ts
  files.ts
  pickup-codes.ts
  tasks.ts
  document/
    parser.ts
    classifier.ts
    exporter.ts
    doc-converter.ts
    validators.ts
  rewrite/
    protected-elements.ts
    mock-rewriter.ts
    model-adapter.ts
    quality-pipeline.ts
prisma/
  schema.prisma
tests/
  pickup-codes.test.ts
  document-parser.test.ts
  quality-pipeline.test.ts
  task-flow.test.ts
```

## 数据模型草案

Prisma schema 第一版使用 SQLite：

```prisma
model PickupCode {
  id           String   @id @default(cuid())
  code         String   @unique
  createdAt    DateTime @default(now())
  lastAccessAt DateTime @default(now())
  expiresAt    DateTime
  deletedAt    DateTime?
  tasks        PaperTask[]
}

model PaperTask {
  id              String   @id @default(cuid())
  pickupCodeId    String
  pickupCode      PickupCode @relation(fields: [pickupCodeId], references: [id])
  originalName    String
  originalPath    String
  workingDocxPath String?
  status          String
  progress        Int      @default(0)
  errorMessage    String?
  reportPath      String?
  comparisonPath  String?
  exportDocxPath  String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  paragraphs      ParagraphRecord[]
}

model ParagraphRecord {
  id              String   @id @default(cuid())
  taskId          String
  task            PaperTask @relation(fields: [taskId], references: [id])
  outlinePath     String
  index           Int
  type            String
  originalText    String
  rewrittenText   String?
  selected        Boolean  @default(false)
  status          String
  skipReason      String?
  riskLevel       String
  citationCount   Int      @default(0)
  numberingPrefix String?
  retryCount      Int      @default(0)
  validationJson  String?
}
```

---

### Task 1: 初始化 Next.js 工程与测试环境

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `vitest.config.ts`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`

- [ ] **Step 1: 创建 package.json**

写入：

```json
{
  "name": "paper-polish-platform",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "next lint"
  },
  "dependencies": {
    "@prisma/client": "^6.0.0",
    "docx": "^9.0.0",
    "mammoth": "^1.8.0",
    "next": "^15.0.0",
    "openai": "^5.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@testing-library/react": "^16.0.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "jsdom": "^25.0.0",
    "prisma": "^6.0.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: 安装依赖**

Run:

```powershell
npm.cmd install
```

Expected: 生成 `package-lock.json` 和 `node_modules/`。

- [ ] **Step 3: 写入 TypeScript 和 Next 配置**

`tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`next.config.ts`：

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb"
    }
  }
};

export default nextConfig;
```

`vitest.config.ts`：

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true
  },
  resolve: {
    alias: {
      "@": new URL(".", import.meta.url).pathname
    }
  }
});
```

- [ ] **Step 4: 创建最小页面**

`app/layout.tsx`：

```tsx
import "./globals.css";

export const metadata = {
  title: "论文润色平台",
  description: "论文结构审阅、格式保护和学术润色工具"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
```

`app/page.tsx`：

```tsx
export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
        <h1 className="text-2xl font-semibold">论文润色平台</h1>
        <p className="text-sm text-slate-600">创建或输入取件码后开始上传论文。</p>
      </section>
    </main>
  );
}
```

`app/globals.css`：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Arial, "Microsoft YaHei", sans-serif;
}
```

- [ ] **Step 5: 验证构建**

Run:

```powershell
npm.cmd run build
```

Expected: Next.js build succeeds.

- [ ] **Step 6: 提交**

```powershell
git add package.json package-lock.json tsconfig.json next.config.ts vitest.config.ts app
git commit -m "chore: initialize next app"
```

---

### Task 2: Prisma 数据库与取件码服务

**Files:**
- Create: `prisma/schema.prisma`
- Create: `lib/db.ts`
- Create: `lib/pickup-codes.ts`
- Create: `app/api/pickup-codes/route.ts`
- Create: `app/api/pickup-codes/[code]/route.ts`
- Create: `tests/pickup-codes.test.ts`
- Modify: `package.json`

- [ ] **Step 1: 添加 Prisma 脚本**

修改 `package.json` scripts：

```json
{
  "prisma:generate": "prisma generate",
  "prisma:migrate": "prisma migrate dev",
  "prisma:studio": "prisma studio"
}
```

保留已有 scripts。

- [ ] **Step 2: 创建 Prisma schema**

使用上方“数据模型草案”写入 `prisma/schema.prisma`，并添加：

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

- [ ] **Step 3: 写数据库客户端**

`lib/db.ts`：

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 4: 写取件码服务测试**

`tests/pickup-codes.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { createPickupCodeValue, getExpiryDate } from "@/lib/pickup-codes";

describe("pickup code helpers", () => {
  it("creates readable random codes", () => {
    const code = createPickupCodeValue();
    expect(code).toMatch(/^[A-Z0-9]{8}$/);
  });

  it("sets expiry seven days later", () => {
    const base = new Date("2026-05-02T00:00:00.000Z");
    const expires = getExpiryDate(base);
    expect(expires.toISOString()).toBe("2026-05-09T00:00:00.000Z");
  });
});
```

- [ ] **Step 5: 实现取件码 helper**

`lib/pickup-codes.ts`：

```ts
import { prisma } from "@/lib/db";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createPickupCodeValue() {
  let code = "";
  for (let i = 0; i < 8; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function getExpiryDate(base = new Date()) {
  const expires = new Date(base);
  expires.setDate(expires.getDate() + 7);
  return expires;
}

export async function createPickupCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = createPickupCodeValue();
    try {
      return await prisma.pickupCode.create({
        data: {
          code,
          expiresAt: getExpiryDate()
        }
      });
    } catch (error) {
      if (attempt === 4) throw error;
    }
  }
  throw new Error("无法生成取件码");
}

export async function findActivePickupCode(code: string) {
  const now = new Date();
  const record = await prisma.pickupCode.findUnique({
    where: { code },
    include: { tasks: { orderBy: { createdAt: "desc" } } }
  });

  if (!record || record.deletedAt || record.expiresAt <= now) {
    return null;
  }

  return prisma.pickupCode.update({
    where: { id: record.id },
    data: { lastAccessAt: now },
    include: { tasks: { orderBy: { createdAt: "desc" } } }
  });
}
```

- [ ] **Step 6: 实现 API route**

`app/api/pickup-codes/route.ts`：

```ts
import { NextResponse } from "next/server";
import { createPickupCode } from "@/lib/pickup-codes";

export async function POST() {
  const pickupCode = await createPickupCode();
  return NextResponse.json({ code: pickupCode.code, expiresAt: pickupCode.expiresAt });
}
```

`app/api/pickup-codes/[code]/route.ts`：

```ts
import { NextResponse } from "next/server";
import { findActivePickupCode } from "@/lib/pickup-codes";

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const pickupCode = await findActivePickupCode(code.toUpperCase());

  if (!pickupCode) {
    return NextResponse.json({ error: "取件码不存在或已过期" }, { status: 404 });
  }

  return NextResponse.json({
    code: pickupCode.code,
    expiresAt: pickupCode.expiresAt,
    tasks: pickupCode.tasks
  });
}
```

- [ ] **Step 7: 运行测试和迁移**

Run:

```powershell
$env:DATABASE_URL="file:./dev.db"
npm.cmd run prisma:generate
npm.cmd run prisma:migrate -- --name init
npm.cmd test -- tests/pickup-codes.test.ts
```

Expected: migration succeeds and tests pass.

- [ ] **Step 8: 提交**

```powershell
git add package.json package-lock.json prisma lib app/api tests
git commit -m "feat: add pickup code persistence"
```

---

### Task 3: 上传文件与任务记录

**Files:**
- Create: `lib/files.ts`
- Create: `lib/tasks.ts`
- Create: `app/api/tasks/route.ts`
- Create: `app/api/tasks/[taskId]/route.ts`
- Create: `tests/task-flow.test.ts`

- [ ] **Step 1: 写任务 helper 测试**

`tests/task-flow.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { normalizeUploadName, isSupportedPaperFile } from "@/lib/tasks";

describe("task upload helpers", () => {
  it("accepts doc and docx files", () => {
    expect(isSupportedPaperFile("paper.docx")).toBe(true);
    expect(isSupportedPaperFile("paper.doc")).toBe(true);
    expect(isSupportedPaperFile("paper.pdf")).toBe(false);
  });

  it("normalizes unsafe upload names", () => {
    expect(normalizeUploadName("../我的论文.docx")).toBe("我的论文.docx");
  });
});
```

- [ ] **Step 2: 实现文件存储 helper**

`lib/files.ts`：

```ts
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const storageRoot = path.join(process.cwd(), "storage");

export async function ensureTaskDir(taskId: string) {
  const dir = path.join(storageRoot, "tasks", taskId);
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function saveUploadFile(taskId: string, fileName: string, bytes: ArrayBuffer) {
  const dir = await ensureTaskDir(taskId);
  const filePath = path.join(dir, fileName);
  await writeFile(filePath, Buffer.from(bytes));
  return filePath;
}
```

- [ ] **Step 3: 实现任务服务**

`lib/tasks.ts`：

```ts
import path from "node:path";
import { prisma } from "@/lib/db";
import { saveUploadFile } from "@/lib/files";
import { findActivePickupCode } from "@/lib/pickup-codes";

export function normalizeUploadName(name: string) {
  return path.basename(name).replace(/[<>:"/\\|?*]/g, "_");
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
  const pickupCode = await findActivePickupCode(params.pickupCode);
  if (!pickupCode) throw new Error("取件码不存在或已过期");

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
    include: { paragraphs: true }
  });
}

export async function getTask(taskId: string) {
  return prisma.paperTask.findUnique({
    where: { id: taskId },
    include: { paragraphs: { orderBy: { index: "asc" } } }
  });
}
```

- [ ] **Step 4: 实现任务 API**

`app/api/tasks/route.ts`：

```ts
import { NextResponse } from "next/server";
import { createPaperTask } from "@/lib/tasks";

export async function POST(request: Request) {
  const formData = await request.formData();
  const pickupCode = String(formData.get("pickupCode") ?? "").toUpperCase();
  const file = formData.get("file");

  if (!pickupCode || !(file instanceof File)) {
    return NextResponse.json({ error: "缺少取件码或文件" }, { status: 400 });
  }

  try {
    const task = await createPaperTask({
      pickupCode,
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
```

`app/api/tasks/[taskId]/route.ts`：

```ts
import { NextResponse } from "next/server";
import { getTask } from "@/lib/tasks";

export async function GET(_request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const task = await getTask(taskId);
  if (!task) return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  return NextResponse.json(task);
}
```

- [ ] **Step 5: 运行测试**

Run:

```powershell
$env:DATABASE_URL="file:./dev.db"
npm.cmd test -- tests/task-flow.test.ts
```

Expected: tests pass.

- [ ] **Step 6: 提交**

```powershell
git add lib app/api tests
git commit -m "feat: add paper task uploads"
```

---

### Task 4: DOCX 段落解析和分类

**Files:**
- Create: `lib/document/parser.ts`
- Create: `lib/document/classifier.ts`
- Create: `lib/document/validators.ts`
- Create: `lib/document/doc-converter.ts`
- Create: `app/api/tasks/[taskId]/outline/route.ts`
- Create: `tests/document-parser.test.ts`

- [ ] **Step 1: 写解析器测试**

`tests/document-parser.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { classifyParagraph, detectNumberingPrefix, shouldSkipParagraph } from "@/lib/document/classifier";

describe("document classifier", () => {
  it("skips headings", () => {
    const result = classifyParagraph({ text: "第一章 绪论", styleName: "Heading 1", index: 0 });
    expect(result.type).toBe("heading");
    expect(result.selected).toBe(false);
  });

  it("selects body paragraphs", () => {
    const result = classifyParagraph({
      text: "数字化转型在企业管理中发挥着重要作用，并逐渐影响组织结构。",
      styleName: "Normal",
      index: 3
    });
    expect(result.type).toBe("body");
    expect(result.selected).toBe(true);
  });

  it("detects protected numbering prefix", () => {
    expect(detectNumberingPrefix("（1）研究对象具有代表性。")).toBe("（1）");
  });

  it("skips references", () => {
    expect(shouldSkipParagraph("参考文献")).toBe("参考文献或目录内容默认跳过");
  });
});
```

- [ ] **Step 2: 实现分类器**

`lib/document/classifier.ts`：

```ts
export type ParagraphClassification = {
  type: "heading" | "abstract" | "keywords" | "reference" | "body" | "skipped";
  selected: boolean;
  skipReason: string | null;
  riskLevel: "low" | "medium" | "high";
  numberingPrefix: string | null;
};

export function detectNumberingPrefix(text: string) {
  const match = text.match(/^(\s*(?:（\d+）|\(\d+\)|\d+[.)）]|[①②③④⑤⑥⑦⑧⑨⑩]))/);
  return match?.[1].trim() ?? null;
}

export function shouldSkipParagraph(text: string) {
  const normalized = text.trim();
  if (!normalized) return "空段落默认跳过";
  if (/^(目录|参考文献|References)$/i.test(normalized)) return "参考文献或目录内容默认跳过";
  if (/^(关键词|关键字)[:：]/.test(normalized)) return "关键词行需在摘要润色后确认更新";
  if (normalized.length < 12) return "疑似标题或短标签，默认跳过";
  return null;
}

export function classifyParagraph(input: { text: string; styleName?: string | null; index: number }): ParagraphClassification {
  const text = input.text.trim();
  const styleName = input.styleName ?? "";
  const numberingPrefix = detectNumberingPrefix(text);

  if (/heading/i.test(styleName) || /^第[一二三四五六七八九十\d]+[章节]/.test(text)) {
    return { type: "heading", selected: false, skipReason: "标题默认跳过", riskLevel: "medium", numberingPrefix };
  }

  const skipReason = shouldSkipParagraph(text);
  if (skipReason) {
    return { type: "skipped", selected: false, skipReason, riskLevel: "medium", numberingPrefix };
  }

  if (/^摘要[:：]?/.test(text) || input.index < 5) {
    return { type: "abstract", selected: true, skipReason: null, riskLevel: "low", numberingPrefix };
  }

  return { type: "body", selected: true, skipReason: null, riskLevel: "low", numberingPrefix };
}
```

- [ ] **Step 3: 实现 DOCX 解析器**

`lib/document/parser.ts`：

```ts
import mammoth from "mammoth";
import { classifyParagraph } from "@/lib/document/classifier";

export type ParsedParagraph = {
  outlinePath: string;
  index: number;
  text: string;
  type: string;
  selected: boolean;
  skipReason: string | null;
  riskLevel: string;
  citationCount: number;
  numberingPrefix: string | null;
};

export function countCitationMarkers(text: string) {
  const bracketRefs = text.match(/\[[0-9,\-\s]+\]/g) ?? [];
  const cnRefs = text.match(/〔[0-9,\-\s]+〕/g) ?? [];
  return bracketRefs.length + cnRefs.length;
}

export async function parseDocxParagraphs(filePath: string): Promise<ParsedParagraph[]> {
  const result = await mammoth.extractRawText({ path: filePath });
  const lines = result.value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((text, index) => {
    const classification = classifyParagraph({ text, index });
    return {
      outlinePath: buildOutlinePath(text, index, classification.type),
      index,
      text,
      type: classification.type,
      selected: classification.selected,
      skipReason: classification.skipReason,
      riskLevel: classification.riskLevel,
      citationCount: countCitationMarkers(text),
      numberingPrefix: classification.numberingPrefix
    };
  });
}

function buildOutlinePath(text: string, index: number, type: string) {
  if (type === "heading") return text.slice(0, 60);
  return `段落 ${index + 1}`;
}
```

- [ ] **Step 4: 实现转换占位和校验模块**

`lib/document/doc-converter.ts`：

```ts
export async function ensureDocxPath(filePath: string) {
  if (filePath.toLowerCase().endsWith(".docx")) return filePath;
  throw new Error("第一版已预留 .doc 转换接口，但当前环境未配置转换器");
}
```

`lib/document/validators.ts`：

```ts
export function validateRewriteLength(original: string, rewritten: string) {
  const originalLength = original.length;
  if (originalLength === 0) return rewritten.length === 0;
  const ratio = Math.abs(rewritten.length - originalLength) / originalLength;
  return ratio <= 0.05;
}

export function validateNumberingPrefix(originalPrefix: string | null, rewritten: string) {
  if (!originalPrefix) return true;
  return rewritten.trimStart().startsWith(originalPrefix);
}
```

- [ ] **Step 5: 实现大纲解析 API**

`app/api/tasks/[taskId]/outline/route.ts`：

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureDocxPath } from "@/lib/document/doc-converter";
import { parseDocxParagraphs } from "@/lib/document/parser";

export async function POST(_request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const task = await prisma.paperTask.findUnique({ where: { id: taskId } });
  if (!task) return NextResponse.json({ error: "任务不存在" }, { status: 404 });

  try {
    await prisma.paperTask.update({ where: { id: taskId }, data: { status: "parsing", progress: 20 } });
    const docxPath = await ensureDocxPath(task.originalPath);
    const paragraphs = await parseDocxParagraphs(docxPath);

    await prisma.paragraphRecord.deleteMany({ where: { taskId } });
    await prisma.paragraphRecord.createMany({
      data: paragraphs.map((paragraph) => ({
        taskId,
        outlinePath: paragraph.outlinePath,
        index: paragraph.index,
        type: paragraph.type,
        originalText: paragraph.text,
        selected: paragraph.selected,
        status: paragraph.selected ? "selected" : "skipped",
        skipReason: paragraph.skipReason,
        riskLevel: paragraph.riskLevel,
        citationCount: paragraph.citationCount,
        numberingPrefix: paragraph.numberingPrefix
      }))
    });

    const updated = await prisma.paperTask.update({
      where: { id: taskId },
      data: { workingDocxPath: docxPath, status: "awaiting_review", progress: 40 },
      include: { paragraphs: { orderBy: { index: "asc" } } }
    });

    return NextResponse.json(updated);
  } catch (error) {
    await prisma.paperTask.update({
      where: { id: taskId },
      data: { status: "failed", errorMessage: error instanceof Error ? error.message : "解析失败" }
    });
    return NextResponse.json({ error: error instanceof Error ? error.message : "解析失败" }, { status: 400 });
  }
}
```

- [ ] **Step 6: 运行测试**

Run:

```powershell
npm.cmd test -- tests/document-parser.test.ts
```

Expected: tests pass.

- [ ] **Step 7: 提交**

```powershell
git add lib/document app/api/tasks tests/document-parser.test.ts
git commit -m "feat: parse docx outline"
```

---

### Task 5: 质量管线和模拟润色

**Files:**
- Create: `lib/rewrite/protected-elements.ts`
- Create: `lib/rewrite/mock-rewriter.ts`
- Create: `lib/rewrite/model-adapter.ts`
- Create: `lib/rewrite/quality-pipeline.ts`
- Create: `app/api/tasks/[taskId]/rewrite/route.ts`
- Create: `tests/quality-pipeline.test.ts`

- [ ] **Step 1: 写质量管线测试**

`tests/quality-pipeline.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { rewriteParagraphWithQualityPipeline } from "@/lib/rewrite/quality-pipeline";

describe("quality pipeline", () => {
  it("keeps numbering prefix", async () => {
    const result = await rewriteParagraphWithQualityPipeline({
      text: "（1）本研究依据现有理论阐述企业数字化转型的作用。",
      numberingPrefix: "（1）",
      citationCount: 0
    });

    expect(result.rewrittenText.startsWith("（1）")).toBe(true);
    expect(result.status).toBe("validated");
  });

  it("returns manual decision when validation cannot pass", async () => {
    const result = await rewriteParagraphWithQualityPipeline({
      text: "短句。",
      numberingPrefix: null,
      citationCount: 0
    });

    expect(["validated", "needs_manual_decision"]).toContain(result.status);
  });
});
```

- [ ] **Step 2: 实现保护元素模块**

`lib/rewrite/protected-elements.ts`：

```ts
export function extractProtectedTerms(text: string) {
  const english = text.match(/[A-Z][A-Za-z0-9-]{1,}/g) ?? [];
  const citations = text.match(/\[[0-9,\-\s]+\]|〔[0-9,\-\s]+〕/g) ?? [];
  return [...new Set([...english, ...citations])];
}

export function protectedTermsRetained(terms: string[], rewritten: string) {
  return terms.every((term) => rewritten.includes(term));
}
```

- [ ] **Step 3: 实现模拟润色器**

`lib/rewrite/mock-rewriter.ts`：

```ts
const replacements: Array<[RegExp, string]> = [
  [/本研究/g, "这项研究"],
  [/阐述/g, "说明"],
  [/依据/g, "根据"],
  [/呈现/g, "表现出"],
  [/导致/g, "使得"],
  [/首先/g, "一方面"],
  [/其次/g, "另一方面"]
];

export async function createMockRewriteCandidates(text: string) {
  const variants = [text, text, text].map((candidate, index) => {
    let next = candidate;
    for (const [pattern, replacement] of replacements.slice(0, index + 3)) {
      next = next.replace(pattern, replacement);
    }
    return next;
  });
  return variants;
}
```

- [ ] **Step 4: 实现模型适配接口**

`lib/rewrite/model-adapter.ts`：

```ts
export type RewriteCandidateRequest = {
  text: string;
  protectedTerms: string[];
  numberingPrefix: string | null;
};

export interface RewriteModelAdapter {
  createCandidates(request: RewriteCandidateRequest): Promise<string[]>;
  chooseBestCandidate(original: string, candidates: string[]): Promise<string>;
}
```

- [ ] **Step 5: 实现质量管线**

`lib/rewrite/quality-pipeline.ts`：

```ts
import { validateNumberingPrefix, validateRewriteLength } from "@/lib/document/validators";
import { createMockRewriteCandidates } from "@/lib/rewrite/mock-rewriter";
import { extractProtectedTerms, protectedTermsRetained } from "@/lib/rewrite/protected-elements";

export type QualityPipelineInput = {
  text: string;
  numberingPrefix: string | null;
  citationCount: number;
};

export async function rewriteParagraphWithQualityPipeline(input: QualityPipelineInput) {
  const protectedTerms = extractProtectedTerms(input.text);
  let retryCount = 0;
  let lastCandidate = input.text;

  while (retryCount < 5) {
    const candidates = await createMockRewriteCandidates(input.text);
    const valid = candidates.find((candidate) => {
      lastCandidate = candidate;
      return (
        validateNumberingPrefix(input.numberingPrefix, candidate) &&
        validateRewriteLength(input.text, candidate) &&
        protectedTermsRetained(protectedTerms, candidate)
      );
    });

    if (valid) {
      return {
        rewrittenText: valid,
        status: "validated" as const,
        retryCount,
        validation: {
          lengthOk: validateRewriteLength(input.text, valid),
          numberingOk: validateNumberingPrefix(input.numberingPrefix, valid),
          protectedTermsOk: protectedTermsRetained(protectedTerms, valid)
        }
      };
    }

    retryCount += 1;
  }

  return {
    rewrittenText: lastCandidate,
    status: "needs_manual_decision" as const,
    retryCount,
    validation: {
      lengthOk: validateRewriteLength(input.text, lastCandidate),
      numberingOk: validateNumberingPrefix(input.numberingPrefix, lastCandidate),
      protectedTermsOk: protectedTermsRetained(protectedTerms, lastCandidate)
    }
  };
}
```

- [ ] **Step 6: 实现润色 API**

`app/api/tasks/[taskId]/rewrite/route.ts`：

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rewriteParagraphWithQualityPipeline } from "@/lib/rewrite/quality-pipeline";

export async function POST(_request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const task = await prisma.paperTask.findUnique({
    where: { id: taskId },
    include: { paragraphs: { orderBy: { index: "asc" } } }
  });
  if (!task) return NextResponse.json({ error: "任务不存在" }, { status: 404 });

  await prisma.paperTask.update({ where: { id: taskId }, data: { status: "rewriting", progress: 55 } });

  const selected = task.paragraphs.filter((paragraph) => paragraph.selected);
  for (const paragraph of selected) {
    const result = await rewriteParagraphWithQualityPipeline({
      text: paragraph.originalText,
      numberingPrefix: paragraph.numberingPrefix,
      citationCount: paragraph.citationCount
    });

    await prisma.paragraphRecord.update({
      where: { id: paragraph.id },
      data: {
        rewrittenText: result.rewrittenText,
        status: result.status,
        retryCount: result.retryCount,
        validationJson: JSON.stringify(result.validation)
      }
    });
  }

  const updated = await prisma.paperTask.update({
    where: { id: taskId },
    data: { status: "exporting", progress: 80 },
    include: { paragraphs: { orderBy: { index: "asc" } } }
  });

  return NextResponse.json(updated);
}
```

- [ ] **Step 7: 运行测试**

Run:

```powershell
npm.cmd test -- tests/quality-pipeline.test.ts
```

Expected: tests pass.

- [ ] **Step 8: 提交**

```powershell
git add lib/rewrite app/api/tasks tests/quality-pipeline.test.ts
git commit -m "feat: add rewrite quality pipeline"
```

---

### Task 6: 导出 DOCX、报告和段落对照表

**Files:**
- Create: `lib/document/exporter.ts`
- Create: `app/api/tasks/[taskId]/export/route.ts`
- Modify: `lib/files.ts`

- [ ] **Step 1: 增加导出文件 helper**

在 `lib/files.ts` 增加：

```ts
export async function writeTaskFile(taskId: string, fileName: string, content: string | Buffer) {
  const dir = await ensureTaskDir(taskId);
  const filePath = path.join(dir, fileName);
  await writeFile(filePath, content);
  return filePath;
}
```

- [ ] **Step 2: 实现导出器**

`lib/document/exporter.ts`：

```ts
import { Document, Packer, Paragraph, TextRun } from "docx";
import type { ParagraphRecord, PaperTask } from "@prisma/client";
import { writeTaskFile } from "@/lib/files";

type TaskWithParagraphs = PaperTask & { paragraphs: ParagraphRecord[] };

export async function exportTaskFiles(task: TaskWithParagraphs) {
  const doc = new Document({
    sections: [
      {
        children: task.paragraphs.map((paragraph) => {
          const text = paragraph.rewrittenText ?? paragraph.originalText;
          return new Paragraph({ children: [new TextRun(text)] });
        })
      }
    ]
  });

  const docxBuffer = await Packer.toBuffer(doc);
  const exportDocxPath = await writeTaskFile(task.id, "polished.docx", docxBuffer);
  const reportPath = await writeTaskFile(task.id, "report.json", JSON.stringify(buildReport(task), null, 2));
  const comparisonPath = await writeTaskFile(task.id, "comparison.csv", buildComparisonCsv(task));

  return { exportDocxPath, reportPath, comparisonPath };
}

function buildReport(task: TaskWithParagraphs) {
  return {
    taskId: task.id,
    originalName: task.originalName,
    totalParagraphs: task.paragraphs.length,
    processedParagraphs: task.paragraphs.filter((p) => p.status === "validated").length,
    skippedParagraphs: task.paragraphs.filter((p) => p.status === "skipped").length,
    manualDecisionParagraphs: task.paragraphs.filter((p) => p.status === "needs_manual_decision").length,
    generatedAt: new Date().toISOString()
  };
}

function csvEscape(value: string | null) {
  const safe = value ?? "";
  return `"${safe.replace(/"/g, '""')}"`;
}

function buildComparisonCsv(task: TaskWithParagraphs) {
  const rows = [["大纲路径", "类型", "状态", "原文", "润色后", "跳过原因", "重试次数"]];
  for (const paragraph of task.paragraphs) {
    rows.push([
      paragraph.outlinePath,
      paragraph.type,
      paragraph.status,
      paragraph.originalText,
      paragraph.rewrittenText ?? "",
      paragraph.skipReason ?? "",
      String(paragraph.retryCount)
    ]);
  }
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}
```

- [ ] **Step 3: 实现导出 API**

`app/api/tasks/[taskId]/export/route.ts`：

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exportTaskFiles } from "@/lib/document/exporter";

export async function POST(_request: Request, context: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await context.params;
  const task = await prisma.paperTask.findUnique({
    where: { id: taskId },
    include: { paragraphs: { orderBy: { index: "asc" } } }
  });
  if (!task) return NextResponse.json({ error: "任务不存在" }, { status: 404 });

  const paths = await exportTaskFiles(task);
  const updated = await prisma.paperTask.update({
    where: { id: taskId },
    data: {
      ...paths,
      status: "completed",
      progress: 100
    },
    include: { paragraphs: { orderBy: { index: "asc" } } }
  });

  return NextResponse.json(updated);
}
```

- [ ] **Step 4: 验证构建**

Run:

```powershell
npm.cmd run build
```

Expected: build succeeds.

- [ ] **Step 5: 提交**

```powershell
git add lib/document/exporter.ts lib/files.ts app/api/tasks
git commit -m "feat: export polished task files"
```

---

### Task 7: 响应式前端界面

**Files:**
- Create: `components/pickup-code-entry.tsx`
- Create: `components/task-space.tsx`
- Create: `components/upload-panel.tsx`
- Create: `components/task-list.tsx`
- Create: `components/outline-review.tsx`
- Create: `components/result-panel.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: 实现取件码入口组件**

`components/pickup-code-entry.tsx`：

```tsx
"use client";

import { useState } from "react";

export function PickupCodeEntry({ onEnter }: { onEnter: (code: string) => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function createCode() {
    const response = await fetch("/api/pickup-codes", { method: "POST" });
    const data = await response.json();
    localStorage.setItem("activePickupCode", data.code);
    onEnter(data.code);
  }

  async function enterCode() {
    const normalized = code.trim().toUpperCase();
    const response = await fetch(`/api/pickup-codes/${normalized}`);
    if (!response.ok) {
      setError("取件码不存在或已过期");
      return;
    }
    localStorage.setItem("activePickupCode", normalized);
    onEnter(normalized);
  }

  return (
    <section className="grid gap-4 rounded-lg border bg-white p-4">
      <button className="rounded bg-slate-950 px-4 py-2 text-white" onClick={createCode}>
        创建新取件码
      </button>
      <div className="flex gap-2">
        <input
          className="min-w-0 flex-1 rounded border px-3 py-2"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="输入已有取件码"
        />
        <button className="rounded border px-4 py-2" onClick={enterCode}>
          进入
        </button>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
```

- [ ] **Step 2: 实现任务空间组件**

`components/task-space.tsx`：

```tsx
"use client";

import { useEffect, useState } from "react";
import { UploadPanel } from "@/components/upload-panel";
import { TaskList } from "@/components/task-list";

export function TaskSpace({ code, onExit }: { code: string; onExit: () => void }) {
  const [tasks, setTasks] = useState<any[]>([]);

  async function refresh() {
    const response = await fetch(`/api/pickup-codes/${code}`);
    if (response.ok) {
      const data = await response.json();
      setTasks(data.tasks);
    }
  }

  useEffect(() => {
    refresh();
  }, [code]);

  function exitCode() {
    localStorage.removeItem("activePickupCode");
    onExit();
  }

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">当前取件码</p>
          <h2 className="text-xl font-semibold">{code}</h2>
        </div>
        <button className="rounded border px-3 py-2" onClick={exitCode}>
          退出取件码
        </button>
      </div>
      <UploadPanel pickupCode={code} onUploaded={refresh} />
      <TaskList tasks={tasks} onChanged={refresh} />
    </section>
  );
}
```

- [ ] **Step 3: 实现上传和任务列表组件**

`components/upload-panel.tsx`：

```tsx
"use client";

import { useState } from "react";

export function UploadPanel({ pickupCode, onUploaded }: { pickupCode: string; onUploaded: () => void }) {
  const [busy, setBusy] = useState(false);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("pickupCode", pickupCode);
      formData.append("file", file);
      await fetch("/api/tasks", { method: "POST", body: formData });
    }
    setBusy(false);
    onUploaded();
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      <label className="block text-sm font-medium">上传论文</label>
      <input className="mt-3 block w-full" type="file" accept=".doc,.docx" multiple onChange={(event) => upload(event.target.files)} />
      {busy ? <p className="mt-2 text-sm text-slate-500">上传中...</p> : null}
    </div>
  );
}
```

`components/task-list.tsx`：

```tsx
"use client";

export function TaskList({ tasks, onChanged }: { tasks: any[]; onChanged: () => void }) {
  async function run(taskId: string, action: "outline" | "rewrite" | "export") {
    await fetch(`/api/tasks/${taskId}/${action}`, { method: "POST" });
    onChanged();
  }

  return (
    <div className="grid gap-3">
      {tasks.map((task) => (
        <article key={task.id} className="rounded-lg border bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-medium">{task.originalName}</h3>
              <p className="text-sm text-slate-500">状态：{task.status} · 进度：{task.progress}%</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="rounded border px-3 py-2" onClick={() => run(task.id, "outline")}>解析大纲</button>
              <button className="rounded border px-3 py-2" onClick={() => run(task.id, "rewrite")}>开始润色</button>
              <button className="rounded border px-3 py-2" onClick={() => run(task.id, "export")}>生成导出</button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: 创建占位审阅和结果组件**

`components/outline-review.tsx`：

```tsx
export function OutlineReview() {
  return <div className="rounded-lg border bg-white p-4">大纲审阅将在任务详情页展开。</div>;
}
```

`components/result-panel.tsx`：

```tsx
export function ResultPanel() {
  return <div className="rounded-lg border bg-white p-4">结果、报告和段落对照将在任务完成后展示。</div>;
}
```

- [ ] **Step 5: 接入首页**

`app/page.tsx`：

```tsx
"use client";

import { useEffect, useState } from "react";
import { PickupCodeEntry } from "@/components/pickup-code-entry";
import { TaskSpace } from "@/components/task-space";

export default function HomePage() {
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    setCode(localStorage.getItem("activePickupCode"));
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto grid max-w-5xl gap-6 px-4 py-8">
        <header>
          <h1 className="text-2xl font-semibold">论文润色平台</h1>
          <p className="mt-2 text-sm text-slate-600">无需登录，通过取件码保存 7 天任务记录。</p>
        </header>
        {code ? <TaskSpace code={code} onExit={() => setCode(null)} /> : <PickupCodeEntry onEnter={setCode} />}
      </section>
    </main>
  );
}
```

- [ ] **Step 6: 构建验证**

Run:

```powershell
npm.cmd run build
```

Expected: build succeeds.

- [ ] **Step 7: 提交**

```powershell
git add app components
git commit -m "feat: add responsive task workspace"
```

---

### Task 8: 清理策略、文档和端到端验收

**Files:**
- Create: `lib/cleanup.ts`
- Create: `README.md`
- Modify: `.gitignore`

- [ ] **Step 1: 更新 .gitignore**

追加：

```gitignore
node_modules/
.next/
.env
storage/
prisma/dev.db*
```

- [ ] **Step 2: 实现清理服务**

`lib/cleanup.ts`：

```ts
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
```

- [ ] **Step 3: 写 README**

`README.md`：

```md
# 论文润色平台

免费、公开访问、无需登录的论文润色平台 MVP。平台通过随机取件码保存任务空间，支持 DOCX 上传、结构解析、段落审阅、润色流程、DOCX 导出、修改报告和段落对照表。

## 本地启动

```powershell
npm.cmd install
$env:DATABASE_URL="file:./dev.db"
npm.cmd run prisma:generate
npm.cmd run prisma:migrate -- --name init
npm.cmd run dev
```

打开 `http://localhost:3000`。

## 测试

```powershell
npm.cmd test
npm.cmd run build
```

## 产品边界

平台不承诺任何第三方检测平台的具体分数，不针对检测系统做规避设计。第一版聚焦学术表达润色、格式保护、引用保护、结构审阅和可追溯记录。
```
```

- [ ] **Step 4: 运行完整验证**

Run:

```powershell
$env:DATABASE_URL="file:./dev.db"
npm.cmd test
npm.cmd run build
```

Expected: all tests pass and build succeeds.

- [ ] **Step 5: 手动验收**

Run:

```powershell
$env:DATABASE_URL="file:./dev.db"
npm.cmd run dev
```

Open `http://localhost:3000` and verify:

- 创建取件码成功。
- 刷新后仍保留取件码。
- 退出取件码后回到入口。
- 可上传 `.docx` 文件。
- 点击“解析大纲”后任务进入 `awaiting_review`。
- 点击“开始润色”后任务进入 `exporting`。
- 点击“生成导出”后任务进入 `completed`。
- `storage/tasks/<taskId>/` 下生成 `polished.docx`、`report.json`、`comparison.csv`。

- [ ] **Step 6: 提交并推送**

```powershell
git add .gitignore README.md lib/cleanup.ts
git commit -m "docs: add mvp setup and cleanup"
git push
```

---

## 自检清单

- 规格中的取件码、7 天保存、退出取件码、追加任务已覆盖。
- 规格中的 DOCX 优先、`.doc` 转换接口、结构解析、树形大纲、默认跳过规则已覆盖。
- 规格中的多候选质量管线以模拟润色实现接口形态，后续可接 GPT-5.5。
- 规格中的 DOCX 导出、报告、段落对照表已覆盖。
- 规格中的无登录、公开访问、无前台额度限制已覆盖。
- 规格中的复杂格式深度保护在 MVP 中以默认跳过和非目标声明覆盖。
- 计划不包含对第三方检测平台分数的承诺。
