"use client";

import React from "react";
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
    <nav className="grid min-w-0 gap-2 md:sticky md:top-4">
      <h4 className="text-sm font-semibold text-slate-700">论文大纲</h4>
      <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 md:grid md:overflow-visible md:pb-0">
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
