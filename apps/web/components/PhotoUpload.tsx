"use client";
import { useRef, useState } from "react";
import { registerPhoto, startPhotoUpload } from "@/app/actions";

type Status = { name: string; pct: number; state: "uploading" | "done" | "error"; error?: string };

/** Photos and videos go straight from her phone to Drive (MM Brand/photos/inbox). */
export function PhotoUpload({ taskId = "", label = "Add photos or videos of Miss M" }: { taskId?: string; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Status[]>([]);
  const set = (i: number, patch: Partial<Status>) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  async function upload(files: FileList) {
    const start = items.length;
    setItems((xs) => [...xs, ...Array.from(files).map((f) => ({ name: f.name, pct: 0, state: "uploading" as const }))]);
    await Promise.all(
      Array.from(files).map(async (file, k) => {
        const i = start + k;
        const type = file.type || "application/octet-stream";
        const s = await startPhotoUpload(file.name, type, file.size);
        if (!s.ok || !s.uploadUrl) return set(i, { state: "error", error: s.error });
        const fileId = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", s.uploadUrl!);
          xhr.setRequestHeader("Content-Type", type);
          xhr.upload.onprogress = (e) => e.lengthComputable && set(i, { pct: Math.round((e.loaded / e.total) * 100) });
          xhr.onload = () => (xhr.status < 300 ? resolve(JSON.parse(xhr.responseText).id) : reject(new Error(`upload failed (${xhr.status})`)));
          xhr.onerror = () => reject(new Error("network error"));
          xhr.send(file);
        }).catch((e: Error) => {
          set(i, { state: "error", error: e.message });
          return "";
        });
        if (!fileId) return;
        const r = await registerPhoto(fileId, file.name, type, taskId);
        set(i, r.ok ? { state: "done", pct: 100 } : { state: "error", error: r.error });
      }),
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-orange-300 bg-white/60 p-4">
      <input ref={input} type="file" accept="image/*,video/mp4,video/quicktime" multiple className="hidden" onChange={(e) => e.target.files?.length && upload(e.target.files)} />
      <button onClick={() => input.current?.click()} className="w-full rounded-full bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white">{label}</button>
      <p className="mt-2 text-center text-xs text-[var(--quiet)]">Face, side, back, paws, playing, sleeping — the more angles the better</p>
      {items.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5 text-xs">
          {items.map((x, i) => (
            <li key={i} className="flex items-center justify-between gap-2">
              <span className="truncate">{x.name}</span>
              <span className={x.state === "error" ? "text-red-600" : "text-[var(--quiet)]"}>
                {x.state === "done" ? "Saved ✓" : x.state === "error" ? x.error : `${x.pct}%`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
