import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { video } from "@/lib/db/schema/app";
import { storage } from "@/lib/aws/s3";
import { completeInputSchema, objectMatches, ownedVideo } from "@/lib/uploads/core";
import { findOwnedVideo } from "@/lib/uploads/videos";
import { isSameOriginJson, jsonError, uploadError } from "@/lib/uploads/http";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("ログインが必要です。", 401);
  if (!isSameOriginJson(request)) return jsonError("リクエストが無効です。", 403);
  try {
    const { videoId } = completeInputSchema.parse(await request.json());
    const row = ownedVideo(await findOwnedVideo(videoId, user.id), user.id);
    if (!row) return jsonError("動画が見つかりません。", 404);
    const { client, bucket } = storage();
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: row.s3Key }));
    if (!objectMatches(row, head)) return jsonError("アップロードした動画のサイズまたは形式が一致しません。", 409);
    await db.update(video).set({ status: "ready" }).where(and(eq(video.id, videoId), eq(video.userId, user.id)));
    return Response.json({ videoId, status: "ready" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return uploadError(error); }
}
