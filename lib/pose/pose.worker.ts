import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import assets from "./assets.json";
import { poseSample } from "./geometry";
import type { PoseRequest, PoseResponse } from "./protocol";

let model: PoseLandmarker | undefined;
const reply = (message: PoseResponse) => self.postMessage(message);
self.addEventListener("message", async (event: MessageEvent<PoseRequest>) => {
  const request = event.data;
  try {
    if (request.type === "init") {
      const bundle = new URL(`${assets.base}/vision_bundle.mjs`, request.origin).href;
      const [vision, response] = await Promise.all([
        import(/* webpackIgnore: true */ bundle) as Promise<typeof import("@mediapipe/tasks-vision")>,
        fetch(new URL(assets.modelPath, request.origin)),
      ]);
      if (!response.ok) throw new Error("Model unavailable");
      const buffer = await response.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", buffer);
      const hash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
      if (hash !== assets.modelSha256) throw new Error("Model mismatch");
      // Next/Turbopack uses a classic Worker bootstrap; use classic WASM glue.
      const files = await vision.FilesetResolver.forVisionTasks(new URL(`${assets.base}/wasm`, request.origin).href, false);
      model = await vision.PoseLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetBuffer: new Uint8Array(buffer), delegate: "CPU" },
        canvas: new OffscreenCanvas(1, 1), runningMode: "IMAGE", numPoses: 1,
        minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, outputSegmentationMasks: false,
      });
      reply({ type: "ready" });
    } else {
      if (!model) throw new Error("Not ready");
      // Independent images allow arbitrary backward seeks without tracking state.
      const result = model.detect(request.bitmap);
      reply({ type: "sample", generation: request.generation, sample: poseSample(request.timestampMs, result.landmarks[0]) });
    }
  } catch {
    model?.close(); model = undefined;
    reply({ type: "error" });
  } finally {
    if (request.type === "detect") request.bitmap.close();
  }
});
