import "server-only";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { storage } from "@/lib/aws/s3";
import { playableVideo, type VideoRecord } from "./core";
import { PRESIGNED_GET_SECONDS } from "./video-constraints";

export async function playbackUrl(row: VideoRecord, userId: string) {
  if (!playableVideo(row, userId)) throw new Error("Video is not playable");
  const { client, bucket } = storage();
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: row.s3Key }), { expiresIn: PRESIGNED_GET_SECONDS });
}
