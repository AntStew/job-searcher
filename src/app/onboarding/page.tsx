import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { jobPreferences, userProfiles, userSettings, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/supabase/getCurrentUser";
import { OnboardingWizard } from "./OnboardingWizard";

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  let [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, user.id));

  // Only true on someone's very first page view, before the Supabase auth
  // trigger has created these rows — everyone else skips straight past this.
  if (!settings) {
    await db.insert(users).values({ id: user.id, email: user.email ?? "" }).onConflictDoNothing();
    await Promise.all([
      db.insert(userProfiles).values({ userId: user.id }).onConflictDoNothing(),
      db.insert(jobPreferences).values({ userId: user.id }).onConflictDoNothing(),
      db.insert(userSettings).values({ userId: user.id }).onConflictDoNothing(),
    ]);
    [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, user.id));
  }

  if (settings?.onboardedAt) {
    redirect("/dashboard");
  }

  return <OnboardingWizard />;
}
