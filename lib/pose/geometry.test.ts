import { describe, expect, it } from "vitest";
import { containRect, drawable, isCurrentSample, poseSample, skeleton, type Landmark } from "./geometry";

const point: Landmark = { x: 0.5, y: 0.5, z: 0, visibility: 1, presence: 1 };
describe("pose display geometry", () => {
  it("fits landscape footage with vertical letterboxing", () => {
    expect(containRect(400, 400, 1920, 1080)).toEqual({ x: 0, y: 87.5, width: 400, height: 225 });
  });
  it("fits decoded portrait footage without applying rotation twice", () => {
    expect(containRect(400, 400, 1080, 1920)).toEqual({ x: 87.5, y: 0, width: 225, height: 400 });
    const resized = containRect(200, 400, 1080, 1920)!;
    expect(resized.x).toBe(0);
    expect(resized.y).toBeCloseTo(200 / 9);
    expect(resized.width).toBe(200);
    expect(resized.height).toBeCloseTo(3200 / 9);
  });
  it.each([0, -1, NaN, Infinity])("rejects invalid dimensions %s", (size) => {
    expect(containRect(size, 100, 100, 100)).toBeNull();
    expect(containRect(100, 100, size, 100)).toBeNull();
  });
  it("maps points and connections using the contained rectangle", () => {
    const points = Array.from({ length: 33 }, () => ({ ...point }));
    const result = skeleton(points, { x: 20, y: 10, width: 200, height: 100 });
    expect(result.points).toHaveLength(33);
    expect(result.points[0]).toEqual({ x: 120, y: 60 });
    expect(result.lines).toHaveLength(35);
  });
  it("omits low-confidence, nonfinite and offscreen points and their lines", () => {
    for (const value of [{ ...point, x: NaN }, { ...point, x: -0.1 }, { ...point, y: 1.1 }, { ...point, visibility: 0.49 }, { ...point, presence: 0.1 }]) expect(drawable(value)).toBe(false);
    expect(skeleton([{ ...point, visibility: 0 }, point], { x: 0, y: 0, width: 10, height: 10 }).lines).toEqual([]);
  });
  it("exports detached media-time samples without retaining SDK arrays", () => {
    const source = [{ ...point }];
    const sample = poseSample(1234, source);
    source[0].x = 0;
    expect(sample.timestampMs).toBe(1234);
    expect(sample.landmarks[0].x).toBe(0.5);
    expect(poseSample(2000, undefined).landmarks).toEqual([]);
  });
  it("discards stale seek generations and delayed results", () => {
    const sample = poseSample(1000, [point]);
    expect(isCurrentSample(sample, 1000, 2, 2)).toBe(true);
    expect(isCurrentSample(sample, 1000, 1, 2)).toBe(false);
    expect(isCurrentSample(sample, 1150, 2, 2)).toBe(false);
    expect(isCurrentSample(sample, 500, 2, 2)).toBe(false);
  });
});
