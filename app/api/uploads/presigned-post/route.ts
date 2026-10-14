import { randomUUID } from "node:crypto";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { video } from "@/lib/db/schema/app";
import { storage } from "@/lib/aws/s3";
import { postOptions, uploadInputSchema, videoKey } from "@/lib/uploads/core";
import { isSameOriginJson, jsonError, uploadError } from "@/lib/uploads/http";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("ログインが必要です。", 401);
  if (!isSameOriginJson(request)) return jsonError("リクエストが無効です。", 403);
  try {
    const input = uploadInputSchema.parse(await request.json());
    const id = randomUUID();
    const s3Key = videoKey(user.id, id, input.contentType);
    const { client, bucket } = storage();
    const post = await createPresignedPost(client, postOptions(bucket, s3Key, input));
    await db.insert(video).values({ id, userId: user.id, s3Key, ...input, status: "uploading" });
    return Response.json({ videoId: id, ...post }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return uploadError(error); }
}
