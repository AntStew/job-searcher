import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { jobPreferences } from "@/db/schema";
import { fetchJobsForUser } from "@/lib/pipeline/fetchJobsForUser";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 120;

/**
 * Manual trigger for the current signed-in user: pulls from the general
 * job-board APIs plus one targeted web search per watched company, and
 * upserts everything into the shared `jobs` cache. Scoring happens
 * separately (see the scoring pipeline).
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [preferences] = await db
    .select()
    .from(jobPreferences)
    .where(eq(jobPreferences.userId, user.id));

  if (!preferences) {
    return NextResponse.json({ error: "No preferences set yet" }, { status: 400 });
  }

  const result = await fetchJobsForUser(preferences);
  return NextResponse.json(result);
}
