import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { jobPreferences, userProfiles, userSettings, users } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm, type SettingsFormInitialValues } from "./SettingsForm";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Defensive: ensure rows exist even if the Supabase auth trigger hasn't
  // been installed yet in this environment.
  await db
    .insert(users)
    .values({ id: user.id, email: user.email ?? "" })
    .onConflictDoNothing();
  await db.insert(userProfiles).values({ userId: user.id }).onConflictDoNothing();
  await db.insert(jobPreferences).values({ userId: user.id }).onConflictDoNothing();
  await db.insert(userSettings).values({ userId: user.id }).onConflictDoNothing();

  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, user.id));
  const [preferences] = await db
    .select()
    .from(jobPreferences)
    .where(eq(jobPreferences.userId, user.id));
  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, user.id));

  const initial: SettingsFormInitialValues = {
    resumeText: profile?.resumeText ?? "",
    desiredRoles: preferences?.desiredRoles ?? [],
    locations: preferences?.locations ?? [],
    remotePreference: preferences?.remotePreference ?? "no_preference",
    salaryMin: preferences?.salaryMin ?? null,
    yearsOfExperience: preferences?.yearsOfExperience ?? null,
    industries: preferences?.industries ?? [],
    aboutYou: preferences?.aboutYou ?? "",
    watchTargets: preferences?.watchTargets ?? [],
    matchThreshold: settings?.matchThreshold ?? 60,
    emailFrequency: settings?.emailFrequency ?? "weekly",
    scheduleHour: settings?.scheduleHour ?? 8,
    scheduleDayOfWeek: settings?.scheduleDayOfWeek ?? 1,
    scheduleDayOfMonth: settings?.scheduleDayOfMonth ?? 1,
    timezone: settings?.timezone ?? "UTC",
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold">Your profile &amp; preferences</h1>
        <p className="text-sm text-muted">
          This is what the job-matching agent uses. Update it any time.
        </p>
      </div>
      <SettingsForm initial={initial} />
    </div>
  );
}
