import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { video } from "@/lib/db/schema/app";

export async function findOwnedVideo(id: string, userId: string) {
  const [row] = await db.select().from(video).where(and(eq(video.id, id), eq(video.userId, userId))).limit(1);
  return row ?? null;
}
export async function listVideos(userId: string) {
  return db.select().from(video).where(eq(video.userId, userId)).orderBy(desc(video.createdAt), desc(video.id));
}
