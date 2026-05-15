# Outline Review Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the left-tree/right-paragraph review workspace so users can inspect parsed paper structure, adjust selected paragraphs, and only then start rewriting.

**Architecture:** Keep parsing and rewriting contracts intact. Add a pure outline derivation module for testable tree/stat logic, add a narrow paragraph-selection API, then render a task-local review workspace inside `TaskList` when a task reaches `awaiting_review`.

**Tech Stack:** Next.js App Router, React client components, Prisma/SQLite, Vitest/jsdom, Tailwind CSS.

---

## File Structure

- Create `lib/review/outline.ts`: Pure helpers for deriving section nodes, visible paragraphs, selectable state, and review statistics from `ParagraphRecord`-like objects.
- Create `tests/outline-review.test.ts`: Unit tests for outline derivation and selection rules.
- Create `lib/review/selections.ts`: Server-side selection validation and update helper. This keeps API route code small and testable.
- Create `app/api/tasks/[taskId]/paragraphs/route.ts`: `PATCH` endpoint for saving paragraph selections.
- Create `tests/paragraph-selections.test.ts`: Unit tests for allowed/disallowed selection updates using plain objects.
- Create `components/task-review.tsx`: Main review workspace component. Owns local checkbox state, selected section, save/start actions.
- Create `components/outline-tree.tsx`: Desktop tree and mobile chapter filter UI.
- Create `components/paragraph-review-list.tsx`: Paragraph cards with checkbox, skip reasons, metadata, and protected markers.
- Modify `components/task-list.tsx`: Render `TaskReview` for `awaiting_review`; keep existing task action buttons for upload/parse/export.
- Create `tests/task-review.test.tsx`: Component tests for review display, checkbox behavior, skipped paragraphs, and callback calls.
- Modify `README.md`: Note the review workspace behavior briefly after implementation.

## Task 1: Outline Derivation Helpers

**Files:**
- Create: `lib/review/outline.ts`
- Test: `tests/outline-review.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/outline-review.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  buildOutlineSections,
  canSelectParagraph,
  countReviewStats,
  getParagraphsForSection
} from "@/lib/review/outline";

const paragraphs = [
  {
    id: "p1",
    index: 0,
    type: "abstract",
    outlinePath: "段落 1",
    originalText: "摘要：人工智能辅助教学正在改变学生学习方式。",
    selected: true,
    status: "selected",
    skipReason: null,
    riskLevel: "low",
    citationCount: 0,
    numberingPrefix: null
  },
  {
    id: "p2",
    index: 1,
    type: "keywords",
    outlinePath: "段落 2",
    originalText: "关键词：人工智能；教学",
    selected: false,
    status: "skipped",
    skipReason: "关键词行需在摘要润色后确认更新",
    riskLevel: "medium",
    citationCount: 0,
    numberingPrefix: null
  },
  {
    id: "p3",
    index: 2,
    type: "heading",
    outlinePath: "第一章 绪论",
    originalText: "第一章 绪论",
    selected: false,
    status: "skipped",
    skipReason: "标题默认跳过",
    riskLevel: "medium",
    citationCount: 0,
    numberingPrefix: null
  },
  {
    id: "p4",
    index: 3,
    type: "body",
    outlinePath: "段落 4",
    originalText: "（1）研究背景。人工智能工具被广泛用于课堂管理[1]。",
    selected: true,
    status: "selected",
    skipReason: null,
    riskLevel: "low",
    citationCount: 1,
    numberingPrefix: "（1）"
  },
  {
    id: "p5",
    index: 4,
    type: "body",
    outlinePath: "段落 5",
    originalText: "研究意义体现在理论和实践两个层面。",
    selected: false,
    status: "selected",
    skipReason: null,
    riskLevel: "low",
    citationCount: 0,
    numberingPrefix: null
  },
  {
    id: "p6",
    index: 5,
    type: "heading",
    outlinePath: "参考文献",
    originalText: "参考文献",
    selected: false,
    status: "skipped",
    skipReason: "参考文献或目录内容默认跳过",
    riskLevel: "medium",
    citationCount: 0,
    numberingPrefix: null
  }
] as const;

describe("outline review helpers", () => {
  it("groups paragraphs under intro and heading sections", () => {
    const sections = buildOutlineSections(paragraphs);

    expect(sections).toMatchObject([
      { id: "intro", title: "未分章节", paragraphIds: ["p1", "p2"], selectedCount: 1 },
      { id: "p3", title: "第一章 绪论", paragraphIds: ["p3", "p4", "p5"], selectedCount: 1 },
      { id: "p6", title: "参考文献", paragraphIds: ["p6"], selectedCount: 0 }
    ]);
  });

  it("filters paragraphs for a selected section", () => {
    const sections = buildOutlineSections(paragraphs);
    const visible = getParagraphsForSection(paragraphs, sections[1].id);

    expect(visible.map((paragraph) => paragraph.id)).toEqual(["p3", "p4", "p5"]);
  });

  it("allows only body and abstract paragraphs to be selected", () => {
    expect(canSelectParagraph({ type: "body" })).toBe(true);
    expect(canSelectParagraph({ type: "abstract" })).toBe(true);
    expect(canSelectParagraph({ type: "heading" })).toBe(false);
    expect(canSelectParagraph({ type: "keywords" })).toBe(false);
    expect(canSelectParagraph({ type: "reference" })).toBe(false);
    expect(canSelectParagraph({ type: "skipped" })).toBe(false);
  });

  it("counts review statistics", () => {
    expect(countReviewStats(paragraphs)).toEqual({
      total: 6,
      selected: 2,
      skipped: 3,
      manualDecision: 0,
      selectable: 3
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm.cmd test -- tests/outline-review.test.ts
```

Expected: FAIL because `@/lib/review/outline` does not exist.

- [ ] **Step 3: Implement the outline helpers**

Create `lib/review/outline.ts`:

```ts
export type ReviewParagraph = {
  id: string;
  index: number;
  type: string;
  outlinePath: string;
  originalText: string;
  selected: boolean;
  status: string;
  skipReason: string | null;
  riskLevel: string;
  citationCount: number;
  numberingPrefix: string | null;
};

export type OutlineSection = {
  id: string;
  title: string;
  paragraphIds: string[];
  totalCount: number;
  selectedCount: number;
  skippedCount: number;
};

const SELECTABLE_TYPES = new Set(["body", "abstract"]);

export function canSelectParagraph(paragraph: Pick<ReviewParagraph, "type">) {
  return SELECTABLE_TYPES.has(paragraph.type);
}

export function buildOutlineSections(paragraphs: readonly ReviewParagraph[]) {
  const sections: OutlineSection[] = [];
  let current: OutlineSection | null = null;

  for (const paragraph of [...paragraphs].sort((a, b) => a.index - b.index)) {
    if (paragraph.type === "heading") {
      current = createSection(paragraph.id, paragraph.originalText);
      sections.push(current);
    } else if (!current) {
      current = createSection("intro", "未分章节");
      sections.push(current);
    }

    current.paragraphIds.push(paragraph.id);
    current.totalCount += 1;
    if (paragraph.selected && canSelectParagraph(paragraph)) current.selectedCount += 1;
    if (!canSelectParagraph(paragraph)) current.skippedCount += 1;
  }

  return sections;
}

export function getParagraphsForSection(
  paragraphs: readonly ReviewParagraph[],
  sectionId: string | null
) {
  const sections = buildOutlineSections(paragraphs);
  const activeSection = sections.find((section) => section.id === sectionId) ?? sections[0];
  if (!activeSection) return [];
  const ids = new Set(activeSection.paragraphIds);
  return [...paragraphs].sort((a, b) => a.index - b.index).filter((paragraph) => ids.has(paragraph.id));
}

export function countReviewStats(paragraphs: readonly ReviewParagraph[]) {
  return paragraphs.reduce(
    (stats, paragraph) => {
      stats.total += 1;
      if (canSelectParagraph(paragraph)) stats.selectable += 1;
      if (paragraph.selected && canSelectParagraph(paragraph)) stats.selected += 1;
      if (!canSelectParagraph(paragraph)) stats.skipped += 1;
      if (paragraph.status === "needs_manual_decision") stats.manualDecision += 1;
      return stats;
    },
    { total: 0, selected: 0, skipped: 0, manualDecision: 0, selectable: 0 }
  );
}

function createSection(id: string, title: string): OutlineSection {
  return {
    id,
    title,
    paragraphIds: [],
    totalCount: 0,
    selectedCount: 0,
    skippedCount: 0
  };
}
```

- [ ] **Step 4: Run the helper tests**

Run:

```powershell
npm.cmd test -- tests/outline-review.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add lib/review/outline.ts tests/outline-review.test.ts
git commit -m "feat: derive outline review sections"
```

## Task 2: Paragraph Selection API

**Files:**
- Create: `lib/review/selections.ts`
- Create: `app/api/tasks/[taskId]/paragraphs/route.ts`
- Test: `tests/paragraph-selections.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/paragraph-selections.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { applySelectionRules } from "@/lib/review/selections";

const records = [
  { id: "body-1", type: "body", selected: true },
  { id: "abstract-1", type: "abstract", selected: true },
  { id: "heading-1", type: "heading", selected: false },
  { id: "keywords-1", type: "keywords", selected: false }
];

describe("paragraph selection rules", () => {
  it("updates selectable paragraphs from requested selections", () => {
    const result = applySelectionRules(records, [
      { id: "body-1", selected: false },
      { id: "abstract-1", selected: true }
    ]);

    expect(result).toEqual([
      { id: "body-1", selected: false },
      { id: "abstract-1", selected: true },
      { id: "heading-1", selected: false },
      { id: "keywords-1", selected: false }
    ]);
  });

  it("forces non-selectable paragraphs to remain unselected", () => {
    const result = applySelectionRules(records, [
      { id: "heading-1", selected: true },
      { id: "keywords-1", selected: true }
    ]);

    expect(result.find((row) => row.id === "heading-1")?.selected).toBe(false);
    expect(result.find((row) => row.id === "keywords-1")?.selected).toBe(false);
  });

  it("ignores unknown paragraph ids", () => {
    const result = applySelectionRules(records, [{ id: "outside", selected: true }]);

    expect(result).toEqual([
      { id: "body-1", selected: true },
      { id: "abstract-1", selected: true },
      { id: "heading-1", selected: false },
      { id: "keywords-1", selected: false }
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm.cmd test -- tests/paragraph-selections.test.ts
```

Expected: FAIL because `@/lib/review/selections` does not exist.

- [ ] **Step 3: Implement selection rules**

Create `lib/review/selections.ts`:

```ts
import { prisma } from "@/lib/db";
import { canSelectParagraph } from "@/lib/review/outline";

export type SelectionPatch = {
  id: string;
  selected: boolean;
};

export type SelectionRecord = {
  id: string;
  type: string;
  selected: boolean;
};

export function applySelectionRules(
  records: readonly SelectionRecord[],
  selections: readonly SelectionPatch[]
) {
  const requested = new Map(selections.map((selection) => [selection.id, selection.selected]));

  return records.map((record) => {
    if (!canSelectParagraph(record)) {
      return { id: record.id, selected: false };
    }

    return {
      id: record.id,
      selected: requested.has(record.id) ? Boolean(requested.get(record.id)) : record.selected
    };
  });
}

export async function updateTaskParagraphSelections(taskId: string, selections: SelectionPatch[]) {
  const task = await prisma.paperTask.findUnique({
    where: { id: taskId },
    include: { paragraphs: { orderBy: { index: "asc" } } }
  });

  if (!task) return null;

  const nextSelections = applySelectionRules(task.paragraphs, selections);

  await prisma.$transaction(
    nextSelections.map((selection) =>
      prisma.paragraphRecord.update({
        where: { id: selection.id },
        data: { selected: selection.selected }
      })
    )
  );

  return prisma.paperTask.findUnique({
    where: { id: taskId },
    include: { paragraphs: { orderBy: { index: "asc" } } }
  });
}
```

- [ ] **Step 4: Create the API route**

Create `app/api/tasks/[taskId]/paragraphs/route.ts`:

```ts
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
```

- [ ] **Step 5: Run the selection tests**

Run:

```powershell
npm.cmd test -- tests/paragraph-selections.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add lib/review/selections.ts app/api/tasks/[taskId]/paragraphs/route.ts tests/paragraph-selections.test.ts
git commit -m "feat: save paragraph review selections"
```

## Task 3: Review Components

**Files:**
- Create: `components/outline-tree.tsx`
- Create: `components/paragraph-review-list.tsx`
- Create: `components/task-review.tsx`
- Modify: `components/task-list.tsx`
- Test: `tests/task-review.test.tsx`

- [ ] **Step 1: Write the failing component tests**

Create `tests/task-review.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskReview } from "@/components/task-review";

const task = {
  id: "task-1",
  status: "awaiting_review",
  paragraphs: [
    {
      id: "heading-1",
      index: 0,
      type: "heading",
      outlinePath: "第一章 绪论",
      originalText: "第一章 绪论",
      selected: false,
      status: "skipped",
      skipReason: "标题默认跳过",
      riskLevel: "medium",
      citationCount: 0,
      numberingPrefix: null
    },
    {
      id: "body-1",
      index: 1,
      type: "body",
      outlinePath: "段落 2",
      originalText: "（1）研究背景。人工智能工具被广泛用于课堂管理[1]。",
      selected: true,
      status: "selected",
      skipReason: null,
      riskLevel: "low",
      citationCount: 1,
      numberingPrefix: "（1）"
    },
    {
      id: "keywords-1",
      index: 2,
      type: "keywords",
      outlinePath: "段落 3",
      originalText: "关键词：人工智能；教学",
      selected: false,
      status: "skipped",
      skipReason: "关键词行需在摘要润色后确认更新",
      riskLevel: "medium",
      citationCount: 0,
      numberingPrefix: null
    }
  ]
};

describe("TaskReview", () => {
  it("renders outline stats and skipped reasons", () => {
    render(<TaskReview task={task} onChanged={vi.fn()} />);

    expect(screen.getByText("大纲审阅")).toBeInTheDocument();
    expect(screen.getByText("第一章 绪论")).toBeInTheDocument();
    expect(screen.getByText("已选 1 / 可选 1")).toBeInTheDocument();
    expect(screen.getByText("跳过：标题默认跳过")).toBeInTheDocument();
    expect(screen.getByText("引用 1")).toBeInTheDocument();
    expect(screen.getByText("编号保护：（1）")).toBeInTheDocument();
  });

  it("lets users toggle selectable paragraphs only", () => {
    render(<TaskReview task={task} onChanged={vi.fn()} />);

    const bodyCheckbox = screen.getByRole("checkbox", { name: /研究背景/ });
    fireEvent.click(bodyCheckbox);

    expect(bodyCheckbox).not.toBeChecked();
    expect(screen.getByText("已选 0 / 可选 1")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /关键词/ })).not.toBeInTheDocument();
  });

  it("saves selections before starting rewrite", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => task
    } as Response);
    const onChanged = vi.fn();
    render(<TaskReview task={task} onChanged={onChanged} />);

    fireEvent.click(screen.getByRole("button", { name: "确认并开始润色" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        "/api/tasks/task-1/paragraphs",
        expect.objectContaining({ method: "PATCH" })
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        "/api/tasks/task-1/rewrite",
        expect.objectContaining({ method: "POST" })
      );
      expect(onChanged).toHaveBeenCalled();
    });

    fetchMock.mockRestore();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
npm.cmd test -- tests/task-review.test.tsx
```

Expected: FAIL because `TaskReview` does not exist.

- [ ] **Step 3: Implement `OutlineTree`**

Create `components/outline-tree.tsx`:

```tsx
"use client";

import type { OutlineSection } from "@/lib/review/outline";

export function OutlineTree({
  sections,
  activeSectionId,
  onSelect
}: {
  sections: OutlineSection[];
  activeSectionId: string | null;
  onSelect: (sectionId: string) => void;
}) {
  return (
    <nav className="grid gap-2 md:sticky md:top-4">
      <h4 className="text-sm font-semibold text-slate-700">论文大纲</h4>
      <div className="flex gap-2 overflow-x-auto pb-1 md:grid md:overflow-visible md:pb-0">
        {sections.map((section) => {
          const active = section.id === activeSectionId;
          return (
            <button
              key={section.id}
              className={[
                "min-w-40 rounded border px-3 py-2 text-left text-sm md:min-w-0",
                active ? "border-slate-950 bg-slate-950 text-white" : "bg-white text-slate-700"
              ].join(" ")}
              onClick={() => onSelect(section.id)}
              type="button"
            >
              <span className="block font-medium">{section.title}</span>
              <span className={active ? "text-slate-200" : "text-slate-500"}>
                {section.selectedCount}/{section.totalCount} 已选
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: Implement `ParagraphReviewList`**

Create `components/paragraph-review-list.tsx`:

```tsx
"use client";

import { canSelectParagraph, type ReviewParagraph } from "@/lib/review/outline";

const typeLabels: Record<string, string> = {
  heading: "标题",
  abstract: "摘要",
  keywords: "关键词",
  reference: "参考文献",
  body: "正文",
  skipped: "跳过"
};

export function ParagraphReviewList({
  paragraphs,
  selectedMap,
  onToggle
}: {
  paragraphs: ReviewParagraph[];
  selectedMap: Record<string, boolean>;
  onToggle: (paragraphId: string, selected: boolean) => void;
}) {
  if (paragraphs.length === 0) {
    return (
      <div className="rounded border bg-white p-4 text-sm text-slate-500">
        暂无可审阅段落，请重新解析或上传其他文档。
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {paragraphs.map((paragraph) => {
        const selectable = canSelectParagraph(paragraph);
        const checked = Boolean(selectedMap[paragraph.id]);
        return (
          <article key={paragraph.id} className="rounded-lg border bg-white p-3">
            <div className="flex items-start gap-3">
              {selectable ? (
                <input
                  aria-label={paragraph.originalText}
                  checked={checked}
                  className="mt-1 size-4"
                  onChange={(event) => onToggle(paragraph.id, event.target.checked)}
                  type="checkbox"
                />
              ) : (
                <span className="mt-0.5 rounded bg-slate-100 px-2 py-1 text-xs text-slate-500">
                  跳过
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>{typeLabels[paragraph.type] ?? paragraph.type}</span>
                  <span>风险 {paragraph.riskLevel}</span>
                  <span>引用 {paragraph.citationCount}</span>
                  {paragraph.numberingPrefix ? <span>编号保护：{paragraph.numberingPrefix}</span> : null}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                  {paragraph.originalText}
                </p>
                {!selectable && paragraph.skipReason ? (
                  <p className="mt-2 text-xs text-slate-500">跳过：{paragraph.skipReason}</p>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Implement `TaskReview`**

Create `components/task-review.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { OutlineTree } from "@/components/outline-tree";
import { ParagraphReviewList } from "@/components/paragraph-review-list";
import {
  buildOutlineSections,
  canSelectParagraph,
  countReviewStats,
  getParagraphsForSection,
  type ReviewParagraph
} from "@/lib/review/outline";

type ReviewTask = {
  id: string;
  paragraphs: ReviewParagraph[];
};

export function TaskReview({ task, onChanged }: { task: ReviewTask; onChanged: () => void }) {
  const [selectedMap, setSelectedMap] = useState(() => createSelectedMap(task.paragraphs));
  const sections = useMemo(() => buildOutlineSections(applyLocalSelection(task.paragraphs, selectedMap)), [task.paragraphs, selectedMap]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(sections[0]?.id ?? null);
  const activeParagraphs = useMemo(
    () => getParagraphsForSection(applyLocalSelection(task.paragraphs, selectedMap), activeSectionId),
    [task.paragraphs, selectedMap, activeSectionId]
  );
  const stats = countReviewStats(applyLocalSelection(task.paragraphs, selectedMap));
  const [busy, setBusy] = useState<"save" | "rewrite" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggle(paragraphId: string, selected: boolean) {
    setSelectedMap((current) => ({ ...current, [paragraphId]: selected }));
  }

  async function saveSelections() {
    setBusy("save");
    setError(null);
    try {
      const response = await fetch(`/api/tasks/${task.id}/paragraphs`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          selections: Object.entries(selectedMap).map(([id, selected]) => ({ id, selected }))
        })
      });
      if (!response.ok) throw new Error("保存选择失败");
      await onChanged();
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : "保存选择失败");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function saveAndRewrite() {
    setBusy("rewrite");
    setError(null);
    try {
      const saved = await fetch(`/api/tasks/${task.id}/paragraphs`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          selections: Object.entries(selectedMap).map(([id, selected]) => ({ id, selected }))
        })
      });
      if (!saved.ok) throw new Error("保存选择失败");

      const rewritten = await fetch(`/api/tasks/${task.id}/rewrite`, { method: "POST" });
      if (!rewritten.ok) throw new Error("启动润色失败");

      await onChanged();
    } catch (error) {
      setError(error instanceof Error ? error.message : "启动润色失败");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mt-4 border-t pt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-semibold">大纲审阅</h4>
          <p className="text-sm text-slate-500">
            已选 {stats.selected} / 可选 {stats.selectable} · 跳过 {stats.skipped}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            disabled={Boolean(busy)}
            onClick={saveSelections}
            type="button"
          >
            {busy === "save" ? "保存中..." : "保存选择"}
          </button>
          <button
            className="rounded bg-slate-950 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={Boolean(busy) || stats.selected === 0}
            onClick={saveAndRewrite}
            type="button"
          >
            {busy === "rewrite" ? "启动中..." : "确认并开始润色"}
          </button>
        </div>
      </div>
      {stats.selected === 0 ? (
        <p className="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          至少选择一个段落后才能开始润色。
        </p>
      ) : null}
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      <div className="grid gap-4 md:grid-cols-[240px_1fr]">
        <OutlineTree sections={sections} activeSectionId={activeSectionId} onSelect={setActiveSectionId} />
        <ParagraphReviewList paragraphs={activeParagraphs} selectedMap={selectedMap} onToggle={toggle} />
      </div>
    </section>
  );
}

function createSelectedMap(paragraphs: ReviewParagraph[]) {
  return Object.fromEntries(
    paragraphs.map((paragraph) => [paragraph.id, canSelectParagraph(paragraph) ? paragraph.selected : false])
  );
}

function applyLocalSelection(paragraphs: ReviewParagraph[], selectedMap: Record<string, boolean>) {
  return paragraphs.map((paragraph) => ({
    ...paragraph,
    selected: canSelectParagraph(paragraph) ? Boolean(selectedMap[paragraph.id]) : false
  }));
}
```

- [ ] **Step 6: Wire `TaskReview` into `TaskList`**

Modify `components/task-list.tsx`:

```tsx
"use client";

import { useState } from "react";
import { TaskReview } from "@/components/task-review";

export function TaskList({ tasks, onChanged }: { tasks: any[]; onChanged: () => void }) {
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  async function run(taskId: string, action: "outline" | "export") {
    setBusyTaskId(taskId);
    setBusyAction(action);
    try {
      await fetch(`/api/tasks/${taskId}/${action}`, { method: "POST" });
      await onChanged();
    } finally {
      setBusyTaskId(null);
      setBusyAction(null);
    }
  }

  return (
    <div className="grid gap-3">
      {tasks.map((task) => (
        <article key={task.id} className="rounded-lg border bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-medium">{task.originalName}</h3>
              <p className="text-sm text-slate-500">
                状态：{task.status} · 进度：{task.progress}%
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded border px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canParse(task.status) || busyTaskId === task.id}
                onClick={() => run(task.id, "outline")}
              >
                {busyTaskId === task.id && busyAction === "outline" ? "解析中..." : "解析大纲"}
              </button>
              <button
                className="rounded border px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canExport(task.status) || busyTaskId === task.id}
                onClick={() => run(task.id, "export")}
              >
                {busyTaskId === task.id && busyAction === "export" ? "导出中..." : "生成导出"}
              </button>
            </div>
          </div>

          {task.status === "awaiting_review" ? <TaskReview task={task} onChanged={onChanged} /> : null}

          {task.status === "completed" ? (
            <div className="mt-3 flex flex-wrap gap-2 border-t pt-3 text-sm">
              <a className="rounded bg-slate-950 px-3 py-2 text-white" href={`/api/tasks/${task.id}/files/docx`}>
                下载 DOCX
              </a>
              <a className="rounded border px-3 py-2" href={`/api/tasks/${task.id}/files/report`}>
                下载报告
              </a>
              <a className="rounded border px-3 py-2" href={`/api/tasks/${task.id}/files/comparison`}>
                下载对照表
              </a>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function canParse(status: string) {
  return ["uploaded", "failed"].includes(status);
}

function canExport(status: string) {
  return ["exporting"].includes(status);
}
```

- [ ] **Step 7: Run component tests**

Run:

```powershell
npm.cmd test -- tests/task-review.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add components/outline-tree.tsx components/paragraph-review-list.tsx components/task-review.tsx components/task-list.tsx tests/task-review.test.tsx
git commit -m "feat: add outline review workspace"
```

## Task 4: Integration Verification and Docs

**Files:**
- Modify: `README.md`
- Maybe modify: tests if previous tasks reveal assertion updates needed

- [ ] **Step 1: Add README note**

Modify `README.md` by adding this under the MVP description:

```md
解析完成后，任务会进入大纲审阅工作台。用户可以按章节查看段落，确认哪些正文和摘要段落参与润色，标题、关键词、参考文献等内容会显示为跳过。
```

- [ ] **Step 2: Run the full test suite**

Run:

```powershell
npm.cmd test
```

Expected: all test files pass.

- [ ] **Step 3: Run production build**

Run:

```powershell
npm.cmd run build
```

Expected: build completes successfully with Next.js route list.

- [ ] **Step 4: Browser QA locally**

Run production server if not already running:

```powershell
$env:DATABASE_URL="file:./dev.db"
npm.cmd run build
npm.cmd run start -- --port 3020
```

In browser QA:

1. Open `http://localhost:3020`.
2. Create a pickup code.
3. Upload a realistic DOCX.
4. Click `解析大纲`.
5. Confirm `大纲审阅` appears.
6. Click a section in the outline.
7. Uncheck one body paragraph.
8. Click `确认并开始润色`.
9. Confirm task reaches `exporting`.
10. Click `生成导出`.
11. Confirm download links appear.
12. Switch to `375x812` viewport and confirm the outline buttons and paragraph cards do not overflow.

- [ ] **Step 5: Commit docs and any final fixes**

```powershell
git add README.md
git commit -m "docs: describe outline review workflow"
```

- [ ] **Step 6: Push**

```powershell
git push
```

## Self-Review

Spec coverage:

- Tree outline display: Task 1 and Task 3.
- Paragraph metadata display: Task 3.
- User selection before rewrite: Task 2 and Task 3.
- Non-selectable skipped content: Task 1, Task 2, Task 3.
- Desktop left-tree/right-paragraph layout: Task 3.
- Mobile section filter/card layout: Task 3 and Task 4 browser QA.
- Tests and QA: Task 1 through Task 4.

Placeholder scan:

- No `TBD`, `TODO`, or “implement later” placeholders.
- Each code-writing step includes full code.

Type consistency:

- `ReviewParagraph`, `OutlineSection`, `SelectionPatch`, and component props are introduced before use.
- API route path matches the spec: `PATCH /api/tasks/[taskId]/paragraphs`.
