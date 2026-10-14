import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireCurrentUser } from "@/lib/current-user";
import { findOwnedVideo } from "@/lib/uploads/videos";
import { playableVideo } from "@/lib/uploads/core";
import { playbackUrl } from "@/lib/uploads/playback";
import { PosePlayer } from "./pose-player";

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCurrentUser();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const video = playableVideo(await findOwnedVideo(id, user.id), user.id);
  if (!video) notFound();
  const url = await playbackUrl(video, user.id);
  return <main className="mx-auto max-w-4xl space-y-6 px-6 py-12">
    <Link href="/videos" className="underline">動画一覧へ</Link>
    <Link href={`/compare?${video.kind === "model" ? "model" : "target"}=${video.id}`} className="ml-4 underline">この動画で比較する</Link>
    <h1 className="break-all text-2xl font-bold">{video.originalName}</h1>
    <PosePlayer key={url} src={url} title={video.originalName} />
    <p className="text-sm text-slate-600">再生できない場合はページを再読み込みしてください。動画のコーデックによってはブラウザで再生できない場合があります。</p>
  </main>;
}
