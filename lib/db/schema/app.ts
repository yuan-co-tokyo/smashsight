import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const videoStatus = pgEnum("video_status", ["uploading", "ready"]);
export const videoKind = pgEnum("video_kind", ["model", "practice"]);
export const video = pgTable("video", {
  id: uuid("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  s3Key: text("s3_key").notNull().unique(),
  originalName: text("original_name").notNull(),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  status: videoStatus("status").default("uploading").notNull(),
  kind: videoKind("kind").default("practice").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [index("video_user_created_idx").on(table.userId, table.createdAt)]);
