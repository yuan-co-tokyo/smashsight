import type { PresignedPostOptions } from "@aws-sdk/s3-presigned-post";
import { z } from "zod";
import { ALLOWED_VIDEO_CONTENT_TYPES, MAX_VIDEO_FILE_SIZE, MAX_VIDEO_NAME_LENGTH, PRESIGNED_POST_SECONDS, VIDEO_EXTENSIONS } from "./video-constraints";

export const uploadInputSchema = z.strictObject({
  kind: z.enum(["model", "practice"]).default("practice"),
  originalName: z.string().trim().min(1).max(MAX_VIDEO_NAME_LENGTH).refine((name) => !/[\\/\u0000-\u001f\u007f]/.test(name), "ファイル名が無効です。"),
  contentType: z.enum(ALLOWED_VIDEO_CONTENT_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_VIDEO_FILE_SIZE),
}).refine((value) => value.originalName.toLowerCase().endsWith(`.${VIDEO_EXTENSIONS[value.contentType]}`), "拡張子と形式が一致しません。");
export const completeInputSchema = z.strictObject({ videoId: z.uuid() });
export type UploadInput = z.infer<typeof uploadInputSchema>;

export function videoKey(userId: string, id: string, contentType: UploadInput["contentType"]) {
  if (!/^[a-zA-Z0-9_-]+$/.test(userId) || !z.uuid().safeParse(id).success) throw new Error("Invalid key identifiers");
  return `videos/${userId}/${id}.${VIDEO_EXTENSIONS[contentType]}`;
}

export function postOptions(bucket: string, key: string, input: UploadInput): PresignedPostOptions {
  return {
    Bucket: bucket, Key: key, Expires: PRESIGNED_POST_SECONDS,
    Fields: { "Content-Type": input.contentType },
    Conditions: [["eq", "$key", key], ["eq", "$Content-Type", input.contentType], ["content-length-range", input.sizeBytes, input.sizeBytes]],
  };
}

export type VideoRecord = { id: string; userId: string; s3Key: string; contentType: string; sizeBytes: number; status: "uploading" | "ready" };
export function ownedVideo<T extends VideoRecord>(video: T | null | undefined, userId: string): T | null {
  return video?.userId === userId ? video : null;
}
export function playableVideo<T extends VideoRecord>(video: T | null | undefined, userId: string): T | null {
  const owned = ownedVideo(video, userId);
  return owned?.status === "ready" ? owned : null;
}
export function objectMatches(video: VideoRecord, head: { ContentLength?: number; ContentType?: string }) {
  return head.ContentLength === video.sizeBytes && head.ContentType === video.contentType && video.sizeBytes > 0 && video.sizeBytes <= MAX_VIDEO_FILE_SIZE;
}
