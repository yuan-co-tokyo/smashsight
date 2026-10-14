import { createHash, timingSafeEqual } from "node:crypto";

export function isValidInviteCode(candidate: unknown, expected: string | undefined): boolean {
  if (typeof candidate !== "string" || !candidate || !expected?.trim()) {
    return false;
  }

  // Compare fixed-size digests so differing input lengths cannot throw or
  // short-circuit the secret comparison. Do not normalize the supplied code.
  const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();
  return timingSafeEqual(digest(candidate), digest(expected));
}
