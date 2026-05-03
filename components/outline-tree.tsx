"use client";

import React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  buildOutlineTree,
  collectAncestorSectionIds,
  type OutlineSection,
  type OutlineTreeNode
} from "@/lib/review/outline";

export function OutlineTree({
  sections,
  activeSectionId,
  onSelect
}: {
  sections: OutlineSection[];
  activeSectionId: string | null;
  onSelect: (sectionId: string) => void;
}) {
  const tree = useMemo(() => buildOutlineTree(sections), [sections]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => getInitialExpandedIds(tree, activeSectionId));

  useEffect(() => {
    setExpandedIds((current) => {
      const next = new Set(current);
      for (const id of collectAncestorSectionIds(tree, activeSectionId)) next.add(id);
      return next;
    });
  }, [activeSectionId, tree]);

  function toggleExpanded(sectionId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  return (
    <nav className="min-w-0 md:sticky md:top-4" aria-label="论文大纲">
      <h4 className="mb-2 text-sm font-semibold text-slate-700">论文大纲</h4>
      <ol className="flex min-w-0 gap-2 overflow-x-auto pb-1 md:block md:max-h-[calc(100vh-7rem)] md:overflow-y-auto md:overflow-x-hidden md:pb-0">
        {tree.map((node) => (
          <OutlineNode
            key={node.id}
            node={node}
            activeSectionId={activeSectionId}
            expandedIds={expandedIds}
            onSelect={onSelect}
            onToggleExpanded={toggleExpanded}
          />
        ))}
      </ol>
    </nav>
  );
}

function OutlineNode({
  node,
  activeSectionId,
  expandedIds,
  onSelect,
  onToggleExpanded
}: {
  node: OutlineTreeNode;
  activeSectionId: string | null;
  expandedIds: Set<string>;
  onSelect: (sectionId: string) => void;
  onToggleExpanded: (sectionId: string) => void;
}) {
  const active = node.id === activeSectionId;
  const hasChildren = node.children.length > 0;
  const expanded = !hasChildren || expandedIds.has(node.id);

  return (
    <li className="min-w-40 shrink-0 md:min-w-0">
      <div
        className={[
          "group flex min-w-0 items-center gap-1 rounded text-sm transition-colors",
          active ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"
        ].join(" ")}
      >
        {hasChildren ? (
          <button
            aria-label={`${expanded ? "收起" : "展开"} ${node.title}`}
            aria-expanded={expanded}
            className={[
              "hidden h-7 w-5 shrink-0 items-center justify-center rounded text-xs md:flex",
              active ? "text-slate-200 hover:bg-slate-800" : "text-slate-500 hover:bg-slate-200"
            ].join(" ")}
            onClick={(event) => {
              event.stopPropagation();
              onToggleExpanded(node.id);
            }}
            type="button"
          >
            <span aria-hidden="true" className={expanded ? "rotate-90" : ""}>
              ›
            </span>
          </button>
        ) : (
          <span aria-hidden="true" className="hidden w-5 shrink-0 md:block" />
        )}
        <button
          className="flex min-w-0 flex-1 items-center gap-2 rounded py-1.5 pr-2 text-left"
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
      </div>
      {hasChildren && expanded ? (
        <ol className="ml-3 border-l border-slate-200 pl-2">
          {node.children.map((child) => (
            <OutlineNode
              key={child.id}
              node={child}
              activeSectionId={activeSectionId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggleExpanded={onToggleExpanded}
            />
          ))}
        </ol>
      ) : null}
    </li>
  );
}

function getInitialExpandedIds(tree: readonly OutlineTreeNode[], activeSectionId: string | null) {
  const expanded = new Set<string>();
  for (const id of collectAncestorSectionIds(tree, activeSectionId)) expanded.add(id);
  for (const node of tree.slice(0, 4)) {
    if (node.children.length > 0) expanded.add(node.id);
  }
  return expanded;
}
