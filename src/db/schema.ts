import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  unique,
  pgEnum,
} from "drizzle-orm/pg-core";

export const remotePreferenceEnum = pgEnum("remote_preference", [
  "remote",
  "hybrid",
  "onsite",
  "no_preference",
]);

export const emailFrequencyEnum = pgEnum("email_frequency", [
  "daily",
  "every_3_days",
  "weekly",
  "paused",
]);

export const jobSourceEnum = pgEnum("job_source", [
  "adzuna",
  "remoteok",
  "greenhouse",
  "lever",
  "web_search",
]);

// Mirrors Supabase auth.users — id must match the Supabase auth user id.
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userProfiles = pgTable("user_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  resumeText: text("resume_text").notNull().default(""),
  resumeUpdatedAt: timestamp("resume_updated_at", { withTimezone: true }),
});

export const jobPreferences = pgTable("job_preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  desiredRoles: text("desired_roles").array().notNull().default([]),
  locations: text("locations").array().notNull().default([]),
  remotePreference: remotePreferenceEnum("remote_preference")
    .notNull()
    .default("no_preference"),
  salaryMin: integer("salary_min"),
  industries: text("industries").array().notNull().default([]),
  mustHaves: text("must_haves").notNull().default(""),
  dealbreakers: text("dealbreakers").notNull().default(""),
  watchTargets: text("watch_targets").array().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  matchThreshold: integer("match_threshold").notNull().default(60),
  emailFrequency: emailFrequencyEnum("email_frequency").notNull().default("weekly"),
  lastEmailSentAt: timestamp("last_email_sent_at", { withTimezone: true }),
  timezone: text("timezone").notNull().default("UTC"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: jobSourceEnum("source").notNull(),
    sourceJobId: text("source_job_id").notNull(),
    url: text("url").notNull(),
    title: text("title").notNull(),
    company: text("company").notNull(),
    location: text("location"),
    remoteType: text("remote_type"),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    descriptionText: text("description_text").notNull().default(""),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    rawJson: jsonb("raw_json"),
  },
  (table) => [unique("jobs_source_source_job_id_unique").on(table.source, table.sourceJobId)],
);

export const jobMatches = pgTable(
  "job_matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    reasoning: text("reasoning").notNull().default(""),
    matchedCriteria: text("matched_criteria").array().notNull().default([]),
    dealbreakerHit: boolean("dealbreaker_hit").notNull().default(false),
    scoredAt: timestamp("scored_at", { withTimezone: true }).notNull().defaultNow(),
    emailedAt: timestamp("emailed_at", { withTimezone: true }),
  },
  (table) => [unique("job_matches_user_id_job_id_unique").on(table.userId, table.jobId)],
);

export const emailSends = pgTable("email_sends", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  jobMatchIds: uuid("job_match_ids").array().notNull().default([]),
  resendMessageId: text("resend_message_id"),
});
