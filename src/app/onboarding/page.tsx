import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { jobPreferences, userProfiles, userSettings, users } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "./OnboardingWizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Defensive: ensure rows exist even if the auth trigger hasn't run.
  await db.insert(users).values({ id: user.id, email: user.email ?? "" }).onConflictDoNothing();
  await db.insert(userProfiles).values({ userId: user.id }).onConflictDoNothing();
  await db.insert(jobPreferences).values({ userId: user.id }).onConflictDoNothing();
  await db.insert(userSettings).values({ userId: user.id }).onConflictDoNothing();

  const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, user.id));
  if (settings?.onboardedAt) {
    redirect("/dashboard");
  }

  return <OnboardingWizard />;
}
