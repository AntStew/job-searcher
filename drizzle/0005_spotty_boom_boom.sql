ALTER TABLE "user_settings" ALTER COLUMN "email_frequency" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "user_settings" ALTER COLUMN "email_frequency" SET DEFAULT 'weekly'::text;--> statement-breakpoint
DROP TYPE "public"."email_frequency";--> statement-breakpoint
CREATE TYPE "public"."email_frequency" AS ENUM('daily', 'weekly', 'monthly', 'paused');--> statement-breakpoint
ALTER TABLE "user_settings" ALTER COLUMN "email_frequency" SET DEFAULT 'weekly'::"public"."email_frequency";--> statement-breakpoint
ALTER TABLE "user_settings" ALTER COLUMN "email_frequency" SET DATA TYPE "public"."email_frequency" USING "email_frequency"::"public"."email_frequency";--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "schedule_hour" integer DEFAULT 8 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "schedule_day_of_week" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "schedule_day_of_month" integer DEFAULT 1 NOT NULL;