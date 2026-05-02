"use client";

import React from "react";
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
    <div className="grid h-fit min-w-0 content-start gap-2">
      {paragraphs.map((paragraph) => {
        const selectable = canSelectParagraph(paragraph);
        const checked = Boolean(selectedMap[paragraph.id]);
        return (
          <article key={paragraph.id} className="min-w-0 rounded-md border bg-white px-3 py-2">
            <div className="flex min-w-0 items-start gap-2.5">
              {selectable ? (
                <input
                  aria-label={paragraph.originalText}
                  checked={checked}
                  className="mt-1 size-4 shrink-0"
                  onChange={(event) => onToggle(paragraph.id, event.target.checked)}
                  type="checkbox"
                />
              ) : (
                <span className="mt-0.5 shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                  跳过
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-500">
                  <span>{typeLabels[paragraph.type] ?? paragraph.type}</span>
                  <span>风险 {paragraph.riskLevel}</span>
                  <span>引用 {paragraph.citationCount}</span>
                  {paragraph.numberingPrefix ? <span>编号保护：{paragraph.numberingPrefix}</span> : null}
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800 [overflow-wrap:anywhere]">
                  {paragraph.originalText}
                </p>
                {!selectable && paragraph.skipReason ? (
                  <p className="mt-1 text-xs text-slate-500">跳过：{paragraph.skipReason}</p>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
