"use client";

import { useState } from "react";

export function PickupCodeEntry({ onEnter }: { onEnter: (code: string) => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function createCode() {
    setError(null);
    try {
      const response = await fetch("/api/pickup-codes", { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.code) {
        setError(data.error ?? "创建取件码失败，请稍后重试");
        return;
      }
      localStorage.setItem("activePickupCode", data.code);
      onEnter(data.code);
    } catch {
      setError("创建取件码失败，请检查服务是否正常运行");
    }
  }

  async function enterCode() {
    setError(null);
    const normalized = code.trim().toUpperCase();
    const response = await fetch(`/api/pickup-codes/${normalized}`);
    if (!response.ok) {
      setError("取件码不存在或已过期");
      return;
    }
    localStorage.setItem("activePickupCode", normalized);
    onEnter(normalized);
  }

  return (
    <section className="grid gap-4 rounded-lg border bg-white p-4">
      <button className="rounded bg-slate-950 px-4 py-2 text-white" onClick={createCode}>
        创建新取件码
      </button>
      <div className="flex gap-2">
        <input
          className="min-w-0 flex-1 rounded border px-3 py-2"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="输入已有取件码"
        />
        <button className="rounded border px-4 py-2" onClick={enterCode}>
          进入
        </button>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
