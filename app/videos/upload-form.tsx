"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { uploadInputSchema } from "@/lib/uploads/core";
import { MAX_VIDEO_FILE_SIZE, PRESIGNED_POST_SECONDS } from "@/lib/uploads/video-constraints";

async function postJson(path: string, body: unknown) {
  const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "リクエストに失敗しました。");
  return result;
}

function uploadFile(url: string, fields: Record<string, string>, file: File, progress: (value: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const data = new FormData();
    for (const [name, value] of Object.entries(fields)) data.append(name, value);
    data.append("file", file); // S3 requires the file field last.
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) progress(Math.round(event.loaded / event.total * 100)); };
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("動画の送信に失敗しました。もう一度ファイルを選んでお試しください。"));
    xhr.onerror = () => reject(new Error("動画の送信中に通信エラーが発生しました。"));
    xhr.ontimeout = () => reject(new Error("動画の送信がタイムアウトしました。"));
    xhr.onabort = () => reject(new Error("動画の送信を中断しました。"));
    xhr.open("POST", url);
    xhr.timeout = PRESIGNED_POST_SECONDS * 1000;
    xhr.send(data);
  });
}

export function UploadForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const file = new FormData(form).get("video");
    setError(""); setMessage(""); setProgress(0);
    if (!(file instanceof File)) { setError("動画を選択してください。"); return; }
    const contentType = file.type || (file.name.toLowerCase().endsWith(".mov") ? "video/quicktime" : file.name.toLowerCase().endsWith(".mp4") ? "video/mp4" : "");
    const input = uploadInputSchema.safeParse({ originalName: file.name, contentType, sizeBytes: file.size, kind: new FormData(form).get("kind") });
    if (!input.success) { setError("100MiB以下の mp4 または mov ファイルを選択してください。"); return; }
    setBusy(true);
    try {
      setMessage("アップロードを準備しています…");
      const signed = await postJson("/api/uploads/presigned-post", input.data);
      setMessage("動画を送信しています…");
      await uploadFile(signed.url, signed.fields, file, setProgress);
      setMessage("アップロードを確認しています…");
      await postJson("/api/uploads/complete", { videoId: signed.videoId });
      setMessage("アップロードが完了しました。");
      form.reset();
    } catch (error) {
      setMessage("");
      setError(error instanceof Error ? error.message : "アップロードに失敗しました。");
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  return <section className="rounded border border-slate-200 p-5">
    <h2 className="mb-3 text-lg font-semibold">動画をアップロード</h2>
    <p id="video-help" className="mb-3 text-sm text-slate-600">mp4 / mov・最大 {MAX_VIDEO_FILE_SIZE / 1024 / 1024}MiB</p>
    <form onSubmit={submit} className="space-y-4">
      <label className="block">動画の種別<select name="kind" defaultValue="practice" disabled={busy} className="ml-3 rounded border p-2"><option value="practice">自分の動画</option><option value="model">お手本</option></select></label>
      <label className="block">動画ファイル<input name="video" type="file" accept=".mp4,.mov,video/mp4,video/quicktime" required disabled={busy} aria-describedby="video-help" className="mt-2 block w-full text-sm" /></label>
      <button disabled={busy} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60">{busy ? "アップロード中…" : "アップロード"}</button>
      {busy && <div><progress aria-label="アップロード進捗" value={progress} max={100} className="w-full" /><p className="text-sm">{progress}%</p></div>}
      <p role="status" className="text-sm">{message}</p>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </form>
  </section>;
}
