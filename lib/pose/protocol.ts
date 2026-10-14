import type { PoseSample } from "./geometry";
export type PoseRequest = { type: "init"; origin: string } | { type: "detect"; bitmap: ImageBitmap; timestampMs: number; generation: number };
export type PoseResponse = { type: "ready" } | { type: "error" } | { type: "sample"; sample: PoseSample; generation: number };
