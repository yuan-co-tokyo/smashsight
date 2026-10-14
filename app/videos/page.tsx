import { requireCurrentUser } from "@/lib/current-user";
import { LogoutButton } from "./logout-button";
import Link from "next/link";
import { listVideos } from "@/lib/uploads/videos";
import { UploadForm } from "./upload-form";

export default async function VideosPage() {
  const user = await requireCurrentUser();
  const videos = await listVideos(user.id);
  return <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-12">
    <h1 className="text-2xl font-bold">ログイン中: {user.name}</h1>
    <LogoutButton />
    <Link href="/compare" className="underline">お手本と比較する</Link>
    <UploadForm />
    {(["model", "practice"] as const).map((kind) => <section key={kind}>
      <h2 className="mb-4 text-xl font-semibold">{kind === "model" ? "お手本" : "自分の動画"}</h2>
      {videos.filter((video) => video.kind === kind).length === 0 ? <p className="text-slate-600">まだ動画はありません。</p> : <ul className="divide-y divide-slate-200">
        {videos.filter((video) => video.kind === kind).map((video) => <li key={video.id} className="py-4">
          {video.status === "ready" ? <Link href={`/videos/${video.id}`} className="break-all font-medium underline">{video.originalName}</Link> : <p className="break-all font-medium">{video.originalName}</p>}
          <p className="mt-1 text-sm text-slate-600">{(video.sizeBytes / 1024 / 1024).toFixed(1)} MiB · {video.status === "ready" ? "再生可能" : "アップロード未完了"}</p>
          <time dateTime={video.createdAt.toISOString()} className="text-sm text-slate-600">{video.createdAt.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}</time>
        </li>)}
      </ul>}
    </section>)}
  </main>;
}
