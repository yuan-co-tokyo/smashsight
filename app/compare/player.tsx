"use client";

import { useEffect, useRef, useState } from "react";
import { PosePlayer } from "@/app/videos/[id]/pose-player";
import { comparisonRange, needsCorrection, targetTimes, type CompareQuery } from "@/lib/compare/core";
import { createPoseScheduler } from "@/lib/pose/scheduler";

export function ComparePlayer({ sources, titles, query }: { sources: string[]; titles: string[]; query: CompareQuery }) {
  const left = useRef<HTMLVideoElement>(null), right = useRef<HTMLVideoElement>(null);
  const refs = [left, right];
  const [scheduler] = useState(createPoseScheduler);
  const [bases, setBases] = useState([0, 0]);
  const [durations, setDurations] = useState([0, 0]);
  const [times, setTimes] = useState([0, 0]);
  const [flips, setFlips] = useState([query.flipModel, query.flipTarget]);
  const [pose, setPose] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [message, setMessage] = useState("");
  const running = useRef(false), epoch = useRef(0);
  const range = comparisonRange(bases, durations);

  function pause() {
    running.current = false; epoch.current++;
    left.current?.pause(); right.current?.pause(); setPlaying(false);
  }
  function seekOffset(offset: number) {
    const result = targetTimes(offset, bases, durations);
    if (!result) return;
    refs.forEach((ref, i) => { if (ref.current && Math.abs(ref.current.currentTime - result.times[i]) > 0.001) ref.current.currentTime = result.times[i]; });
    setTimes(result.times);
  }
  function seekOne(index: number, value: number) {
    pause(); const video = index === 0 ? left.current : right.current;
    if (video) video.currentTime = value; readTimes();
  }
  function setReference(index: number) {
    pause(); const time = (index === 0 ? left.current : right.current)?.currentTime ?? 0;
    setBases((old) => old.map((value, i) => i === index ? time : value));
  }
  function readTimes() { setTimes([left.current?.currentTime ?? 0, right.current?.currentTime ?? 0]); }
  function loaded() { setDurations([left.current?.duration ?? 0, right.current?.duration ?? 0]); readTimes(); }
  function play() {
    const a = left.current, b = right.current;
    if (!a || !b || !range) return;
    const offset = a.currentTime - bases[0];
    seekOffset(offset >= range.max - 0.01 ? 0 : offset);
    a.playbackRate = rate; b.playbackRate = rate;
    setMessage(""); running.current = true; setPlaying(true);
    const token = ++epoch.current;
    // Both play() calls occur synchronously in the user's gesture (iOS).
    const first = a.play(), second = b.play();
    void Promise.all([first, second]).then(() => {
      if (epoch.current !== token && !running.current) { a.pause(); b.pause(); }
    }).catch(() => {
      if (epoch.current === token) { pause(); setMessage("再生を開始できませんでした。読み込み後に再生を押してください。"); }
    });
  }
  function mirror(index: number, value: boolean) {
    const next = flips.map((old, i) => i === index ? value : old);
    setFlips(next);
    const url = new URL(window.location.href);
    url.searchParams.set("flipModel", next[0] ? "1" : "0");
    url.searchParams.set("flipTarget", next[1] ? "1" : "0");
    window.history.replaceState(null, "", url);
  }
  useEffect(() => {
    const a = left.current, b = right.current;
    let frame = 0;
    function stop() { running.current = false; epoch.current++; a?.pause(); b?.pause(); setPlaying(false); }
    function tick() {
      if (running.current && a && b) {
        const target = targetTimes(a.currentTime - bases[0], bases, durations);
        if (!target || target.atEnd || a.ended || b.ended) {
          stop();
          const range = comparisonRange(bases, durations);
          const end = range && targetTimes(range.max, bases, durations);
          if (end) { a.currentTime = end.times[0]; b.currentTime = end.times[1]; }
        }
        else if (!a.seeking && !b.seeking && needsCorrection(b.currentTime, target.times[1])) b.currentTime = target.times[1];
      }
      frame = requestAnimationFrame(tick);
    }
    function hide() { if (document.hidden) stop(); }
    frame = requestAnimationFrame(tick);
    document.addEventListener("visibilitychange", hide);
    function retire() { running.current = false; epoch.current++; a?.pause(); b?.pause(); }
    return () => { cancelAnimationFrame(frame); document.removeEventListener("visibilitychange", hide); retire(); };
  }, [bases, durations]);

  const button = "rounded border border-slate-300 px-3 py-2 disabled:opacity-50";
  return <section className="space-y-5">
    <p className="text-sm text-slate-600">各動画をシークし、インパクトなどを基準点に設定してください。未設定なら先頭が基準です。</p>
    <div className="grid gap-6 md:grid-cols-2">
      {[0, 1].map((i) => <section key={i} className="min-w-0 space-y-3">
        <h2 className="break-all font-semibold">{i === 0 ? "お手本" : "比較対象"}: {titles[i]}</h2>
        <PosePlayer src={sources[i]} title={titles[i]} videoRef={i === 0 ? left : right} poseEnabled={pose} mirrored={flips[i]} scheduler={scheduler} onLoadedMetadata={loaded} onTimeUpdate={readTimes} onEnded={pause}
          onWaiting={() => { if (running.current) { pause(); setMessage("動画を読み込んでいます。読み込み後に再生を押してください。"); } }} />
        <label className="block">個別シーク ({times[i].toFixed(2)}秒)<input aria-label={`${i === 0 ? "お手本" : "比較対象"}のシーク`} type="range" min={0} max={Number.isFinite(durations[i]) ? durations[i] : 0} step={0.01} value={times[i]} disabled={!range} className="block w-full" onChange={(event) => {
          seekOne(i, Number(event.target.value));
        }} /></label>
        <button className={button} disabled={!range} onClick={() => setReference(i)}>現在位置を基準点にする</button>
        <p className="text-sm">基準点: {bases[i].toFixed(2)}秒</p>
        <label className="flex items-center gap-2"><input type="checkbox" checked={flips[i]} onChange={(event) => mirror(i, event.target.checked)} />左右反転</label>
      </section>)}
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <button className={button} disabled={!range} onClick={playing ? pause : play}>{playing ? "一時停止" : "同期再生"}</button>
      {[-1, 1].map((direction) => <button key={direction} className={button} disabled={!range} onClick={() => { pause(); seekOffset((left.current?.currentTime ?? bases[0]) - bases[0] + direction / 30); }}>{direction < 0 ? "1コマ戻る" : "1コマ進む"}</button>)}
      <button className={button} disabled={!range} onClick={() => { pause(); seekOffset(0); }}>基準点へ戻る</button>
      <label>再生速度<select className="ml-2 rounded border p-2" value={rate} onChange={(event) => {
        const value = Number(event.target.value); setRate(value); refs.forEach((ref) => { if (ref.current) ref.current.playbackRate = value; });
      }}>{[0.25, 0.5, 1].map((value) => <option key={value} value={value}>{value}倍</option>)}</select></label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={pose} onChange={(event) => setPose(event.target.checked)} />両方の骨格表示</label>
    </div>
    <p role="status" className="text-sm">{message}</p>
    <p className="text-sm text-slate-600">音声はミュートです。コマ送りは1/30秒刻みです。基準点はこの画面内だけで保持し、再読み込みで先頭に戻ります。</p>
  </section>;
}
