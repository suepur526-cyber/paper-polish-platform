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
              <p className="text-sm text-slate-500">
                状态：{task.status} · 进度：{task.progress}%
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="rounded border px-3 py-2" onClick={() => run(task.id, "outline")}>
                解析大纲
              </button>
              <button className="rounded border px-3 py-2" onClick={() => run(task.id, "rewrite")}>
                开始润色
              </button>
              <button className="rounded border px-3 py-2" onClick={() => run(task.id, "export")}>
                生成导出
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
