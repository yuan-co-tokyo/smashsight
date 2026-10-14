"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { startPosePlayer, type PoseStatus } from "@/lib/pose/player";
import type { PoseScheduler } from "@/lib/pose/scheduler";
import { mirrorTransform } from "@/lib/compare/core";

const messages: Record<PoseStatus, string> = {
  loading: "骨格表示を準備しています。動画はそのまま再生できます。",
  ready: "骨格表示が有効です。全身が映る場面で再生してください。",
  missing: "この場面では人物を検出できませんでした。",
  unsupported: "このブラウザでは骨格表示を利用できません。通常再生をご利用ください。",
  failed: "骨格を表示できませんでした。通常再生は利用できます。再試行する場合は骨格表示をオフにしてからオンにしてください。",
  background: "画面を離れたため骨格表示を停止しました。再開する場合はオフにしてからオンにしてください。",
};
export function PosePlayer({ src, title, videoRef, poseEnabled, mirrored = false, scheduler, onTimeUpdate, onLoadedMetadata, onEnded, onWaiting }: {
  src: string; title: string; videoRef?: RefObject<HTMLVideoElement | null>; poseEnabled?: boolean; mirrored?: boolean; scheduler?: PoseScheduler;
  onTimeUpdate?: () => void; onLoadedMetadata?: () => void; onEnded?: () => void; onWaiting?: () => void;
}) {
  const internalVideo = useRef<HTMLVideoElement>(null);
  const video = videoRef ?? internalVideo;
  const canvas = useRef<HTMLCanvasElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [cors, setCors] = useState(true);
  const [status, setStatus] = useState<PoseStatus>("loading");
  const [mediaError, setMediaError] = useState(false);
  const active = poseEnabled ?? enabled;
  useEffect(() => {
    if (!active || !cors || !video.current || !canvas.current) return;
    return startPosePlayer(video.current, canvas.current, setStatus, undefined, scheduler);
  }, [active, cors, src, scheduler, video]);
  return <section className="space-y-3">
    <div className="relative w-full bg-black" style={{ transform: mirrorTransform(mirrored) }}>
      <video key={cors ? "cors" : "normal"} ref={video} src={src} crossOrigin={cors ? "anonymous" : undefined} controls={!videoRef} muted={!!videoRef} playsInline preload="metadata" className="block max-h-[70vh] w-full object-contain" aria-label={title}
        onTimeUpdate={onTimeUpdate} onLoadedMetadata={onLoadedMetadata} onEnded={onEnded} onWaiting={onWaiting}
        onError={() => { onWaiting?.(); if (cors) { setEnabled(false); setCors(false); } else setMediaError(true); }} />
      <canvas ref={canvas} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
    </div>
    {poseEnabled === undefined && <label className="flex items-center gap-2"><input type="checkbox" checked={enabled} disabled={!cors || mediaError} onChange={(event) => { setStatus("loading"); setEnabled(event.target.checked); }} />骨格表示</label>}
    <p role="status" className="text-sm text-slate-600">{mediaError ? "動画を再生できません。ページの再読み込みや別のブラウザをお試しください。" : !cors ? "動画の読み取りに失敗したため、骨格なしの通常再生に切り替えました。" : active ? messages[status] : "骨格表示はオフです。"}</p>
    <p className="text-sm text-slate-600">全画面・ピクチャインピクチャでは動画のみ表示されます。</p>
  </section>;
}
