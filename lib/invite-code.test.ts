import { describe, expect, it } from "vitest";
import { isValidInviteCode } from "./invite-code";

describe("isValidInviteCode", () => {
  it("accepts only an exact match", () => {
    expect(isValidInviteCode("tennis-秘密", "tennis-秘密")).toBe(true);
  });

  it.each([undefined, "", "   "])("fails closed for unconfigured code %j", (expected) => {
    expect(isValidInviteCode(expected, expected)).toBe(false);
    expect(isValidInviteCode("anything", expected)).toBe(false);
  });

  it.each([undefined, null, 123, {}, [], "", "wrong", "a", "tennis-code-longer", "TENNIS-code", "tennis-code ", " tennis-code"])("rejects invalid input %j", (candidate) => {
    expect(isValidInviteCode(candidate, "tennis-code")).toBe(false);
  });

  it("does not normalize Unicode or accept equal-length mismatches", () => {
    expect(isValidInviteCode("e\u0301", "é")).toBe(false);
    expect(isValidInviteCode("tennis-codf", "tennis-code")).toBe(false);
  });
});
