import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentUser } from "@/lib/current-user";
import { compareQuerySchema } from "@/lib/compare/core";
import { findOwnedVideo, listVideos } from "@/lib/uploads/videos";
import { playableVideo } from "@/lib/uploads/core";
import { playbackUrl } from "@/lib/uploads/playback";
import { ComparePlayer } from "./player";

export default async function ComparePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireCurrentUser();
  const parsed = compareQuerySchema.safeParse(await searchParams);
  if (!parsed.success) notFound();
  const query = parsed.data;
  async function selected(id: string | undefined, kind: "model" | "practice") {
    if (!id) return null;
    const video = playableVideo(await findOwnedVideo(id, user.id), user.id);
    if (!video || video.kind !== kind) notFound();
    return video;
  }
  const [model, target, videos] = await Promise.all([selected(query.model, "model"), selected(query.target, "practice"), listVideos(user.id)]);
  const ready = videos.filter((video) => video.status === "ready");
  const urls = model && target ? await Promise.all([playbackUrl(model, user.id), playbackUrl(target, user.id)]) : null;
  return <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
    <Link href="/videos" className="underline">動画一覧へ</Link>
    <h1 className="text-2xl font-bold">お手本と比較</h1>
    <form action="/compare" className="flex flex-wrap items-end gap-4">
      {(["model", "target"] as const).map((key) => <label key={key} className="flex flex-col gap-1">{key === "model" ? "お手本" : "比較対象"}
        <select name={key} defaultValue={query[key] ?? ""} required className="max-w-full rounded border p-2">
          <option value="">動画を選択</option>
          {ready.filter((video) => video.kind === (key === "model" ? "model" : "practice")).map((video) => <option key={video.id} value={video.id}>{video.originalName}</option>)}
        </select>
      </label>)}
      <button className="rounded bg-slate-900 px-4 py-2 text-white">比較する</button>
    </form>
    {model && target && urls ? <ComparePlayer key={`${model.id}:${target.id}`} sources={urls} titles={[model.originalName, target.originalName]} query={query} /> : <p>お手本と自分の動画をそれぞれアップロードし、選択してください。</p>}
  </main>;
}
