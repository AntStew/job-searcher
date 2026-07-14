CREATE TYPE "public"."application_status" AS ENUM('none', 'interested', 'applied', 'interviewing', 'rejected', 'offer');--> statement-breakpoint
CREATE TYPE "public"."match_feedback" AS ENUM('liked', 'disliked');--> statement-breakpoint
ALTER TABLE "job_matches" ADD COLUMN "feedback" "match_feedback";--> statement-breakpoint
ALTER TABLE "job_matches" ADD COLUMN "application_status" "application_status" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "onboarded_at" timestamp with time zone;