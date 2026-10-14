import { expect, it } from "vitest";
import { createPoseScheduler } from "./scheduler";

it("serializes inference and gives a waiting peer priority", () => {
  const gate = createPoseScheduler(), a = {}, b = {};
  expect(gate.acquire(a)).toBe(true);
  expect(gate.acquire(b)).toBe(false);
  gate.release(a);
  expect(gate.acquire(a)).toBe(false);
  expect(gate.acquire(b)).toBe(true);
  gate.release(b);
  expect(gate.acquire(a)).toBe(true);
});
it("releases reservations when a paused or disposed player leaves", () => {
  const gate = createPoseScheduler(), a = {}, b = {};
  gate.acquire(a); gate.acquire(b); gate.release(a);
  gate.leave(b);
  expect(gate.acquire(a)).toBe(true);
  gate.leave(a);
  expect(gate.acquire(b)).toBe(true);
});
