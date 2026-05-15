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
      const response = await fetch(`/api/tasks/${taskId}/${action}`, { method: "POST" });
      if (!response.ok) throw new Error("启动任务失败");
      await onChanged();
    } finally {
      setBusyTaskId(null);
      setBusyAction(null);
    }
  }

  return (
    <div className="grid min-w-0 gap-3">
      {tasks.map((task) => (
        <article key={task.id} className="min-w-0 rounded-lg border bg-white p-4">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="break-words font-medium">{task.originalName}</h3>
              <p className="text-sm text-slate-500">
                状态：{statusLabel(task.status)} · 进度：{task.progress}%
              </p>
              {task.errorMessage ? <p className="mt-1 text-sm text-red-600">{task.errorMessage}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded border px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canParse(task.status) || busyTaskId === task.id}
                onClick={() => run(task.id, "outline")}
              >
                {busyTaskId === task.id && busyAction === "outline" ? "启动中..." : "解析大纲"}
              </button>
              <button
                className="rounded border px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canExport(task.status) || busyTaskId === task.id}
                onClick={() => run(task.id, "export")}
              >
                {busyTaskId === task.id && busyAction === "export" ? "启动中..." : "重新生成导出"}
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
  return ["completed"].includes(status);
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    uploaded: "已上传",
    queued_parse: "等待解析",
    parsing: "正在解析结构",
    awaiting_review: "等待审阅",
    queued_rewrite: "等待润色",
    rewriting: "正在润色",
    queued_export: "等待导出",
    exporting: "正在生成导出",
    completed: "已完成",
    failed: "失败"
  };
  return labels[status] ?? status;
}
