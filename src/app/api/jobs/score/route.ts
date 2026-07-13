import { NextResponse } from "next/server";
import { runScoringForUser } from "@/lib/scoring/runScoringForUser";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 180;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runScoringForUser(user.id);
  return NextResponse.json(result);
}
