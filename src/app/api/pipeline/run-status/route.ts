import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { isRunInProgress } from "@/lib/pipeline/runStatus";
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

  return NextResponse.json({
    running: isRunInProgress(settings?.runStartedAt ?? null),
    lastRunError: settings?.lastRunError ?? null,
    lastManualRunAt: settings?.lastManualRunAt?.toISOString() ?? null,
  });
}
