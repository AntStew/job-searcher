import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { jobPreferences, userProfiles, userSettings } from "@/db/schema";

// Shared by the Settings form and the onboarding wizard so both flows save
// through identical validation and writes.
export const settingsSchema = z.object({
  resumeText: z.string().max(20000),
  desiredRoles: z.string().max(2000),
  locations: z.string().max(2000),
  remotePreference: z.enum(["remote", "hybrid", "onsite", "no_preference"]),
  salaryMin: z.string().optional(),
  yearsOfExperience: z.string().optional(),
  industries: z.string().max(2000),
  aboutYou: z.string().max(4000),
  watchTargets: z.string().max(2000),
  matchThreshold: z.coerce.number().int().min(0).max(100),
  emailFrequency: z.enum(["daily", "weekly", "monthly", "paused"]),
  scheduleHour: z.coerce.number().int().min(0).max(23),
  scheduleDayOfWeek: z.coerce.number().int().min(0).max(6),
  scheduleDayOfMonth: z.coerce.number().int().min(1).max(28),
  timezone: z.string().min(1),
});

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export type SavedSettings = {
  resumeText: string;
  desiredRoles: string[];
  locations: string[];
  remotePreference: "remote" | "hybrid" | "onsite" | "no_preference";
  salaryMin: number | null;
  yearsOfExperience: number | null;
  industries: string[];
  aboutYou: string;
  watchTargets: string[];
  matchThreshold: number;
  emailFrequency: "daily" | "weekly" | "monthly" | "paused";
  scheduleHour: number;
  scheduleDayOfWeek: number;
  scheduleDayOfMonth: number;
  timezone: string;
};

export type PersistSettingsResult =
  | { ok: true; saved: SavedSettings }
  | { ok: false; error: string };

export async function persistSettings(
  userId: string,
  formData: FormData,
): Promise<PersistSettingsResult> {
  const parsed = settingsSchema.safeParse({
    resumeText: formData.get("resumeText") ?? "",
    desiredRoles: formData.get("desiredRoles") ?? "",
    locations: formData.get("locations") ?? "",
    remotePreference: formData.get("remotePreference") ?? "no_preference",
    salaryMin: formData.get("salaryMin") ?? "",
    yearsOfExperience: formData.get("yearsOfExperience") ?? "",
    industries: formData.get("industries") ?? "",
    aboutYou: formData.get("aboutYou") ?? "",
    watchTargets: formData.get("watchTargets") ?? "",
    matchThreshold: formData.get("matchThreshold") ?? "60",
    emailFrequency: formData.get("emailFrequency") ?? "weekly",
    scheduleHour: formData.get("scheduleHour") ?? "8",
    scheduleDayOfWeek: formData.get("scheduleDayOfWeek") ?? "1",
    scheduleDayOfMonth: formData.get("scheduleDayOfMonth") ?? "1",
    timezone: formData.get("timezone") ?? "UTC",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const [currentSettings] = await db
    .select({ adminLocked: userSettings.adminLocked })
    .from(userSettings)
    .where(eq(userSettings.userId, userId));

  const data = parsed.data;
  // Server-side backstop: even if a request is crafted to bypass the
  // disabled UI, a locked account can never re-enable its own schedule.
  if (currentSettings?.adminLocked) {
    data.emailFrequency = "paused";
  }
  const salaryMin = data.salaryMin ? Number.parseInt(data.salaryMin, 10) : null;
  const yearsOfExperience = data.yearsOfExperience
    ? Number.parseInt(data.yearsOfExperience, 10)
    : null;
  const desiredRoles = splitList(data.desiredRoles);
  const locations = splitList(data.locations);
  const industries = splitList(data.industries);
  const watchTargets = splitList(data.watchTargets);
  const finalSalaryMin = Number.isFinite(salaryMin) ? salaryMin : null;
  const finalYearsOfExperience = Number.isFinite(yearsOfExperience) ? yearsOfExperience : null;

  await db.transaction(async (tx) => {
    await tx
      .update(userProfiles)
      .set({ resumeText: data.resumeText, resumeUpdatedAt: new Date() })
      .where(eq(userProfiles.userId, userId));

    await tx
      .update(jobPreferences)
      .set({
        desiredRoles,
        locations,
        remotePreference: data.remotePreference,
        salaryMin: finalSalaryMin,
        yearsOfExperience: finalYearsOfExperience,
        industries,
        aboutYou: data.aboutYou,
        watchTargets,
        updatedAt: new Date(),
      })
      .where(eq(jobPreferences.userId, userId));

    await tx
      .update(userSettings)
      .set({
        matchThreshold: data.matchThreshold,
        emailFrequency: data.emailFrequency,
        scheduleHour: data.scheduleHour,
        scheduleDayOfWeek: data.scheduleDayOfWeek,
        scheduleDayOfMonth: data.scheduleDayOfMonth,
        timezone: data.timezone,
        updatedAt: new Date(),
      })
      .where(eq(userSettings.userId, userId));
  });

  return {
    ok: true,
    saved: {
      resumeText: data.resumeText,
      desiredRoles,
      locations,
      remotePreference: data.remotePreference,
      salaryMin: finalSalaryMin,
      yearsOfExperience: finalYearsOfExperience,
      industries,
      aboutYou: data.aboutYou,
      watchTargets,
      matchThreshold: data.matchThreshold,
      emailFrequency: data.emailFrequency,
      scheduleHour: data.scheduleHour,
      scheduleDayOfWeek: data.scheduleDayOfWeek,
      scheduleDayOfMonth: data.scheduleDayOfMonth,
      timezone: data.timezone,
    },
  };
}
