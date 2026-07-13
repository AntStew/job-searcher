ALTER TABLE "job_preferences" ADD COLUMN "years_of_experience" integer;--> statement-breakpoint
ALTER TABLE "job_preferences" ADD COLUMN "about_you" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "experience_required" text;