"use client";

import React from "react";
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
  const paragraphsWithLocalSelection = useMemo(
    () => applyLocalSelection(task.paragraphs, selectedMap),
    [task.paragraphs, selectedMap]
  );
  const sections = useMemo(
    () => buildOutlineSections(paragraphsWithLocalSelection),
    [paragraphsWithLocalSelection]
  );
  const [activeSectionId, setActiveSectionId] = useState<string | null>(sections[0]?.id ?? null);
  const activeParagraphs = useMemo(
    () => getParagraphsForSection(paragraphsWithLocalSelection, activeSectionId),
    [paragraphsWithLocalSelection, activeSectionId]
  );
  const stats = countReviewStats(paragraphsWithLocalSelection);
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
