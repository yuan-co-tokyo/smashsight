CREATE TYPE "public"."video_kind" AS ENUM('model', 'practice');--> statement-breakpoint
ALTER TABLE "video" ADD COLUMN "kind" "video_kind" DEFAULT 'practice' NOT NULL;