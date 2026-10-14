import { describe, expect, it } from "vitest";
import { compareQuerySchema, comparisonRange, mirrorTransform, mirrorX, needsCorrection, targetTimes } from "./core";
import { uploadInputSchema } from "@/lib/uploads/core";
import { isProtectedRoute } from "@/lib/auth-routes";

describe("comparison timeline", () => {
  it("aligns distinct reference points using one relative offset", () => {
    expect(targetTimes(0, [3, 7], [10, 12])?.times).toEqual([3, 7]);
    expect(targetTimes(2, [3, 7], [10, 12])?.times).toEqual([5, 9]);
    expect(targetTimes(-1 / 30, [3, 7], [10, 12])?.times[0]).toBeCloseTo(3 - 1 / 30);
  });
  it("clamps to the common playable interval", () => {
    expect(comparisonRange([3, 7], [10, 12])).toEqual({ min: -3, max: 5 });
    expect(targetTimes(-100, [3, 7], [10, 12])?.times).toEqual([0, 4]);
    expect(targetTimes(100, [3, 7], [10, 12])).toEqual({ offset: 5, times: [8, 12], atEnd: true });
    expect(targetTimes(9, [0, 0], [4, 8])?.times).toEqual([4, 4]);
  });
  it("rejects unknown durations and invalid references", () => {
    expect(comparisonRange([0, 0], [NaN, 10])).toBeNull();
    expect(comparisonRange([-1, 0], [5, 10])).toBeNull();
    expect(comparisonRange([6, 0], [5, 10])).toBeNull();
    expect(targetTimes(Infinity, [0, 0], [5, 10])).toBeNull();
  });
  it("corrects only meaningful drift", () => {
    expect(needsCorrection(1.1, 1)).toBe(false);
    expect(needsCorrection(1.2, 1)).toBe(true);
    expect(needsCorrection(0.8, 1)).toBe(true);
  });
});
describe("comparison query and mirroring", () => {
  const uuid = "5ec7295f-76d9-4f79-93f1-8010993bfa2a";
  it("accepts missing selections and explicit mirror flags", () => {
    expect(compareQuerySchema.parse({})).toEqual({ flipModel: false, flipTarget: false });
    expect(compareQuerySchema.parse({ model: uuid, target: "", flipModel: "1", flipTarget: "0" })).toEqual({ model: uuid, target: undefined, flipModel: true, flipTarget: false });
  });
  it.each([{ model: "invalid" }, { target: [uuid, uuid] }, { flipModel: "true" }, { flipTarget: ["1", "0"] }])("rejects malformed or repeated known parameters %j", (query) => {
    expect(compareQuerySchema.safeParse(query).success).toBe(false);
  });
  it("mirrors around the center and uses the same parent transform for video and canvas", () => {
    expect(mirrorX(0.2, true)).toBe(0.8);
    expect(mirrorX(0.2, false)).toBe(0.2);
    expect(mirrorX(0.5, true)).toBe(0.5);
    expect(mirrorTransform(true)).toBe("scaleX(-1)");
    expect(mirrorTransform(false)).toBe("scaleX(1)");
  });
  it("validates upload kinds with a backwards-compatible practice default", () => {
    const input = { originalName: "serve.mp4", contentType: "video/mp4", sizeBytes: 10 };
    expect(uploadInputSchema.parse(input).kind).toBe("practice");
    expect(uploadInputSchema.parse({ ...input, kind: "model" }).kind).toBe("model");
    expect(uploadInputSchema.safeParse({ ...input, kind: "other" }).success).toBe(false);
  });
  it("protects compare and children without matching similar public paths", () => {
    expect(isProtectedRoute("/compare")).toBe(true);
    expect(isProtectedRoute("/compare/child")).toBe(true);
    expect(isProtectedRoute("/compare-other")).toBe(false);
  });
});
