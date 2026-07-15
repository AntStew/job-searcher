import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { clearStaleRunLock, isRunInProgress } from "@/lib/pipeline/runStatus";
import { createClient } from "@/lib/supabase/server";

/** Polled by the dashboard after "Run now" kicks the edge function. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [settings] = await db
    .select({
      runStartedAt: userSettings.runStartedAt,
      lastRunError: userSettings.lastRunError,
      lastManualRunAt: userSettings.lastManualRunAt,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, user.id));

  const cleared = await clearStaleRunLock(user.id, settings?.runStartedAt ?? null);
  const runStartedAt = cleared ? null : (settings?.runStartedAt ?? null);

  const [fresh] = cleared
    ? await db
        .select({ lastRunError: userSettings.lastRunError })
        .from(userSettings)
        .where(eq(userSettings.userId, user.id))
    : [settings];

  return NextResponse.json({
    running: isRunInProgress(runStartedAt),
    lastRunError: fresh?.lastRunError ?? null,
    lastManualRunAt: settings?.lastManualRunAt?.toISOString() ?? null,
  });
}
