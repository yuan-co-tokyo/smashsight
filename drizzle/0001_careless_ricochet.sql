CREATE TYPE "public"."video_status" AS ENUM('uploading', 'ready');--> statement-breakpoint
CREATE TABLE "video" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"s3_key" text NOT NULL,
	"original_name" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"status" "video_status" DEFAULT 'uploading' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "video_s3_key_unique" UNIQUE("s3_key")
);
--> statement-breakpoint
ALTER TABLE "video" ADD CONSTRAINT "video_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "video_user_created_idx" ON "video" USING btree ("user_id","created_at");