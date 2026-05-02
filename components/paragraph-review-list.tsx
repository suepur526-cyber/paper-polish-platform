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
    <div className="grid min-w-0 gap-3">
      {paragraphs.map((paragraph) => {
        const selectable = canSelectParagraph(paragraph);
        const checked = Boolean(selectedMap[paragraph.id]);
        return (
          <article key={paragraph.id} className="min-w-0 rounded-lg border bg-white p-3">
            <div className="flex min-w-0 items-start gap-3">
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
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800 [overflow-wrap:anywhere]">
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
