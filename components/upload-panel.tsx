"use client";

import { useState } from "react";

export function UploadPanel({
  pickupCode,
  onUploaded
}: {
  pickupCode: string;
  onUploaded: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("pickupCode", pickupCode);
      formData.append("file", file);
      await fetch("/api/tasks", { method: "POST", body: formData });
    }
    setBusy(false);
    onUploaded();
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      <label className="block text-sm font-medium">上传论文</label>
      <input
        className="mt-3 block w-full"
        type="file"
        accept=".doc,.docx"
        multiple
        onChange={(event) => upload(event.target.files)}
      />
      {busy ? <p className="mt-2 text-sm text-slate-500">上传中...</p> : null}
    </div>
  );
}
