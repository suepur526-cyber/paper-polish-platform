"use client";

import { useEffect, useState } from "react";
import { TaskList } from "@/components/task-list";
import { UploadPanel } from "@/components/upload-panel";

export function TaskSpace({ code, onExit }: { code: string; onExit: () => void }) {
  const [tasks, setTasks] = useState<any[]>([]);

  async function refresh() {
    const response = await fetch(`/api/pickup-codes/${code}`);
    if (response.ok) {
      const data = await response.json();
      setTasks(data.tasks);
    }
  }

  useEffect(() => {
    refresh();
  }, [code]);

  function exitCode() {
    localStorage.removeItem("activePickupCode");
    onExit();
  }

  return (
    <section className="grid min-w-0 gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">当前取件码</p>
          <h2 className="text-xl font-semibold">{code}</h2>
        </div>
        <button className="rounded border px-3 py-2" onClick={exitCode}>
          退出取件码
        </button>
      </div>
      <UploadPanel pickupCode={code} onUploaded={refresh} />
      <TaskList tasks={tasks} onChanged={refresh} />
    </section>
  );
}
