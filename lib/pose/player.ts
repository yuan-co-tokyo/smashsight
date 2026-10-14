import { containRect, isCurrentSample, skeleton, type PoseSample } from "./geometry";
import type { PoseResponse } from "./protocol";
import type { PoseScheduler } from "./scheduler";

export type PoseStatus = "loading" | "ready" | "missing" | "unsupported" | "failed" | "background";
export function startPosePlayer(video: HTMLVideoElement, canvas: HTMLCanvasElement, status: (value: PoseStatus) => void, onSample?: (sample: PoseSample) => void, scheduler?: PoseScheduler) {
  const owner = {};
  let worker: Worker | undefined;
  let disposed = false, ready = false, busy = false, generation = 0, raf = 0;
  let lastTimestamp = -1, lastRequest = -Infinity;
  let latest: PoseSample | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  const ctx = canvas.getContext("2d");
  const clear = () => ctx?.clearRect(0, 0, canvas.width, canvas.height);
  function stop() {
    disposed = true;
    scheduler?.leave(owner);
    cancelAnimationFrame(raf);
    clearTimeout(deadline);
    worker?.terminate(); worker = undefined; latest = undefined;
    clear();
    video.removeEventListener("seeking", invalidate);
    video.removeEventListener("seeked", invalidate);
    video.removeEventListener("loadeddata", invalidate);
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("pagehide", pagehide);
  }
  function fail(reason: PoseStatus) { if (!disposed) { stop(); status(reason); } }
  function invalidate() { generation++; latest = undefined; lastTimestamp = -1; clear(); }
  function visibility() { if (document.hidden) fail("background"); }
  function pagehide() { fail("background"); }
  function paint() {
    if (!ctx) return;
    const size = video.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(size.width * ratio)), height = Math.max(1, Math.round(size.height * ratio));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    clear();
    if (!latest || !isCurrentSample(latest, video.currentTime * 1000, generation, generation) || video.seeking) return;
    // videoWidth/Height and drawImage(video) already reflect decoder rotation.
    // Use those oriented dimensions once; do not rotate the pose again.
    const rect = containRect(width, height, video.videoWidth, video.videoHeight);
    if (!rect) return;
    const drawing = skeleton(latest.landmarks, rect);
    ctx.strokeStyle = "#00ff88"; ctx.fillStyle = "#00ff88"; ctx.lineWidth = 2 * ratio;
    for (const [a, b] of drawing.lines) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    for (const p of drawing.points) { ctx.beginPath(); ctx.arc(p.x, p.y, 3 * ratio, 0, Math.PI * 2); ctx.fill(); }
  }
  async function capture(timestampMs: number) {
    busy = true; const ownGeneration = generation;
    let bitmap: ImageBitmap | undefined;
    deadline = setTimeout(() => fail("failed"), 15000);
    try {
      // Capture the displayed, oriented video through canvas, avoiding platform
      // differences in createImageBitmap(video) rotation. No hidden video/play.
      const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
      const frame = document.createElement("canvas");
      frame.width = Math.max(1, Math.round(video.videoWidth * scale));
      frame.height = Math.max(1, Math.round(video.videoHeight * scale));
      const context = frame.getContext("2d");
      if (!context) throw new Error("Canvas unavailable");
      context.drawImage(video, 0, 0, frame.width, frame.height);
      bitmap = await createImageBitmap(frame);
      if (disposed || ownGeneration !== generation) { bitmap.close(); clearTimeout(deadline); busy = false; scheduler?.release(owner); return; }
      worker!.postMessage({ type: "detect", bitmap, timestampMs, generation: ownGeneration }, [bitmap]);
    } catch { bitmap?.close(); fail("failed"); }
  }
  function tick(now: number) {
    if (disposed) return;
    paint();
    const time = video.currentTime * 1000;
    if (ready && !busy && !video.seeking && !video.ended && video.readyState >= 2 && video.videoWidth > 0 && time !== lastTimestamp && now - lastRequest >= (scheduler ? 200 : 100)) {
      if (!scheduler || scheduler.acquire(owner)) {
        lastTimestamp = time; lastRequest = now;
        void capture(time);
      }
    } else if (!busy) {
      scheduler?.leave(owner);
    }
    raf = requestAnimationFrame(tick);
  }
  video.addEventListener("seeking", invalidate);
  video.addEventListener("seeked", invalidate);
  video.addEventListener("loadeddata", invalidate);
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("pagehide", pagehide);
  // Defer notification to avoid synchronous React state updates in an effect.
  queueMicrotask(() => {
    if (disposed) return;
    if (!ctx || !window.isSecureContext || typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined" || typeof createImageBitmap === "undefined") { fail("unsupported"); return; }
    status("loading");
    try {
      worker = new Worker(new URL("./pose.worker.ts", import.meta.url), { type: "module", name: "smashsight-pose" });
      worker.onmessage = (event: MessageEvent<PoseResponse>) => {
        if (disposed) return;
        clearTimeout(deadline);
        const message = event.data;
        if (message.type === "error") { fail("failed"); return; }
        if (message.type === "ready") { ready = true; status("ready"); return; }
        busy = false;
        scheduler?.release(owner);
        if (!isCurrentSample(message.sample, video.currentTime * 1000, message.generation, generation)) return;
        latest = message.sample;
        onSample?.(message.sample);
        status(latest.landmarks.length ? "ready" : "missing");
      };
      worker.onerror = (event) => { event.preventDefault(); fail("failed"); };
      worker.onmessageerror = () => fail("failed");
      deadline = setTimeout(() => fail("failed"), 60000);
      worker.postMessage({ type: "init", origin: window.location.origin });
      raf = requestAnimationFrame(tick);
    } catch { fail("unsupported"); }
  });
  return stop;
}
