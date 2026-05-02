"use client";

import { useEffect, useState } from "react";
import { PickupCodeEntry } from "@/components/pickup-code-entry";
import { TaskSpace } from "@/components/task-space";

export default function HomePage() {
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    setCode(localStorage.getItem("activePickupCode"));
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto grid min-w-0 max-w-5xl gap-6 px-4 py-8">
        <header>
          <h1 className="text-2xl font-semibold">论文润色平台</h1>
          <p className="mt-2 text-sm text-slate-600">
            无需登录，通过取件码保存 7 天任务记录。
          </p>
        </header>
        {code ? (
          <TaskSpace code={code} onExit={() => setCode(null)} />
        ) : (
          <PickupCodeEntry onEnter={setCode} />
        )}
      </section>
    </main>
  );
}
