import { describe, expect, it } from "vitest";
import { completeInputSchema, objectMatches, ownedVideo, playableVideo, postOptions, uploadInputSchema, videoKey, type VideoRecord } from "./core";
import { MAX_VIDEO_FILE_SIZE, PRESIGNED_POST_SECONDS } from "./video-constraints";

const id = "5ec7295f-76d9-4f79-93f1-8010993bfa2a";
const input = { originalName: "serve.mp4", contentType: "video/mp4" as const, sizeBytes: 100, kind: "practice" as const };
const row: VideoRecord = { id, userId: "alice", s3Key: `videos/alice/${id}.mp4`, contentType: input.contentType, sizeBytes: 100, status: "uploading" };

describe("upload validation", () => {
  it("accepts the maximum size and mov", () => {
    expect(uploadInputSchema.safeParse({ ...input, sizeBytes: MAX_VIDEO_FILE_SIZE }).success).toBe(true);
    expect(uploadInputSchema.safeParse({ ...input, originalName: "SERVE.MOV", contentType: "video/quicktime" }).success).toBe(true);
  });
  it.each([0, -1, 1.5, MAX_VIDEO_FILE_SIZE + 1, "100", null])("rejects invalid size %j", (sizeBytes) => {
    expect(uploadInputSchema.safeParse({ ...input, sizeBytes }).success).toBe(false);
  });
  it.each(["", "../serve.mp4", "folder/serve.mp4", "folder\\serve.mp4", "serve\n.mp4", "serve.mov", "x".repeat(256) + ".mp4"])("rejects invalid name %j", (originalName) => {
    expect(uploadInputSchema.safeParse({ ...input, originalName }).success).toBe(false);
  });
  it("rejects unsupported media and client-selected keys", () => {
    expect(uploadInputSchema.safeParse({ ...input, contentType: "text/html" }).success).toBe(false);
    expect(uploadInputSchema.safeParse({ ...input, s3Key: "videos/bob/stolen.mp4" }).success).toBe(false);
    expect(completeInputSchema.safeParse({ videoId: "not-a-uuid" }).success).toBe(false);
  });
});

describe("keys and POST policy", () => {
  it("generates an owner-scoped key independent of the original filename", () => {
    expect(videoKey("alice", id, "video/mp4")).toBe(row.s3Key);
    expect(videoKey("alice", id, "video/quicktime")).toBe(`videos/alice/${id}.mov`);
    expect(() => videoKey("../bob", id, "video/mp4")).toThrow();
    expect(() => videoKey("alice", "../bad", "video/mp4")).toThrow();
  });
  it("pins key, content type and exact declared size with a short expiry", () => {
    const options = postOptions("smashsight-test", row.s3Key, input);
    expect(options.Conditions).toContainEqual(["eq", "$key", row.s3Key]);
    expect(options.Conditions).toContainEqual(["eq", "$Content-Type", "video/mp4"]);
    expect(options.Conditions).toContainEqual(["content-length-range", 100, 100]);
    expect(options.Fields).toEqual({ "Content-Type": "video/mp4" });
    expect(options.Expires).toBe(PRESIGNED_POST_SECONDS);
    expect(options.Expires).toBeLessThanOrEqual(300);
  });
});

describe("ownership and completion", () => {
  it("treats missing and other users' videos equally", () => {
    expect(ownedVideo(null, "alice")).toBeNull();
    expect(ownedVideo(row, "bob")).toBeNull();
    expect(ownedVideo(row, "alice")).toBe(row);
  });
  it("only permits playback of owned ready videos", () => {
    expect(playableVideo(row, "alice")).toBeNull();
    expect(playableVideo({ ...row, status: "ready" }, "bob")).toBeNull();
    expect(playableVideo({ ...row, status: "ready" }, "alice")).not.toBeNull();
  });
  it("requires matching object size and type", () => {
    expect(objectMatches(row, { ContentLength: 100, ContentType: "video/mp4" })).toBe(true);
    for (const head of [{}, { ContentLength: 99, ContentType: "video/mp4" }, { ContentLength: 100, ContentType: "text/html" }]) {
      expect(objectMatches(row, head)).toBe(false);
    }
  });
});
