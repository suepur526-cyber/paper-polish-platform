"use client";

import React from "react";
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

          {task.status === "awaiting_review" && Array.isArray(task.paragraphs) ? (
            <TaskReview task={task} onChanged={onChanged} />
          ) : null}

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
