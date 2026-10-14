import { z } from "zod";
const id = z.union([z.uuid(), z.literal("")]).optional().transform((value) => value || undefined);
const flag = z.enum(["0", "1"]).optional().transform((value) => value === "1");
export const compareQuerySchema = z.object({ model: id, target: id, flipModel: flag, flipTarget: flag });
export type CompareQuery = z.infer<typeof compareQuerySchema>;
export function mirrorX(x: number, mirrored: boolean) { return mirrored ? 1 - x : x; }
export function mirrorTransform(mirrored: boolean) { return `scaleX(${mirrorX(1, mirrored) - mirrorX(0, mirrored)})`; }
export function comparisonRange(bases: readonly number[], durations: readonly number[]) {
  if (bases.length !== 2 || durations.length !== 2 || durations.some((d, i) => !Number.isFinite(d) || d <= 0 || !Number.isFinite(bases[i]) || bases[i] < 0 || bases[i] > d)) return null;
  return { min: -Math.min(...bases), max: Math.min(...durations.map((d, i) => d - bases[i])) };
}
export function targetTimes(offset: number, bases: readonly number[], durations: readonly number[]) {
  const range = comparisonRange(bases, durations);
  if (!range || !Number.isFinite(offset)) return null;
  const clamped = Math.max(range.min, Math.min(range.max, offset));
  return { offset: clamped, times: bases.map((base) => base + clamped), atEnd: clamped >= range.max };
}
export function needsCorrection(actual: number, expected: number) { return Math.abs(actual - expected) > 0.12; }
