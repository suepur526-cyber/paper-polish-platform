"use client";

import React from "react";
import { buildOutlineTree, type OutlineSection, type OutlineTreeNode } from "@/lib/review/outline";

export function OutlineTree({
  sections,
  activeSectionId,
  onSelect
}: {
  sections: OutlineSection[];
  activeSectionId: string | null;
  onSelect: (sectionId: string) => void;
}) {
  const tree = buildOutlineTree(sections);

  return (
    <nav className="min-w-0 md:sticky md:top-4" aria-label="论文大纲">
      <h4 className="mb-2 text-sm font-semibold text-slate-700">论文大纲</h4>
      <ol className="flex min-w-0 gap-2 overflow-x-auto pb-1 md:block md:max-h-[calc(100vh-7rem)] md:overflow-y-auto md:overflow-x-hidden md:pb-0">
        {tree.map((node) => (
          <OutlineNode
            key={node.id}
            node={node}
            activeSectionId={activeSectionId}
            onSelect={onSelect}
          />
        ))}
      </ol>
    </nav>
  );
}

function OutlineNode({
  node,
  activeSectionId,
  onSelect
}: {
  node: OutlineTreeNode;
  activeSectionId: string | null;
  onSelect: (sectionId: string) => void;
}) {
  const active = node.id === activeSectionId;
  const hasChildren = node.children.length > 0;

  return (
    <li className="min-w-40 shrink-0 md:min-w-0">
      <button
        className={[
          "group flex w-full min-w-0 items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors",
          active ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"
        ].join(" ")}
        onClick={() => onSelect(node.id)}
        type="button"
      >
        <span
          aria-hidden="true"
          className={[
            "hidden size-1.5 shrink-0 rounded-full md:block",
            active ? "bg-white" : hasChildren ? "bg-slate-500" : "bg-slate-300"
          ].join(" ")}
        />
        <span className="min-w-0 flex-1 truncate font-medium">{node.title}</span>
        <span className={["shrink-0 tabular-nums", active ? "text-slate-200" : "text-slate-500"].join(" ")}>
          {node.selectedCount}/{node.totalCount}
        </span>
      </button>
      {hasChildren ? (
        <ol className="ml-3 border-l border-slate-200 pl-2">
          {node.children.map((child) => (
            <OutlineNode
              key={child.id}
              node={child}
              activeSectionId={activeSectionId}
              onSelect={onSelect}
            />
          ))}
        </ol>
      ) : null}
    </li>
  );
}
