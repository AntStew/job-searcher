"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { jobMatches } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

type Feedback = "liked" | "disliked" | null;
type ApplicationStatus = "none" | "interested" | "applied" | "interviewing" | "rejected" | "offer";

async function requireUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function setMatchFeedback(matchId: string, feedback: Feedback) {
  const userId = await requireUserId();
  if (!userId) return { ok: false as const };

  await db
    .update(jobMatches)
    .set({ feedback })
    .where(and(eq(jobMatches.id, matchId), eq(jobMatches.userId, userId)));

  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function setMatchStatus(matchId: string, status: ApplicationStatus) {
  const userId = await requireUserId();
  if (!userId) return { ok: false as const };

  await db
    .update(jobMatches)
    .set({ applicationStatus: status })
    .where(and(eq(jobMatches.id, matchId), eq(jobMatches.userId, userId)));

  revalidatePath("/dashboard");
  return { ok: true as const };
}
