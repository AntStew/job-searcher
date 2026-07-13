import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { verifyUserToken } from "@/lib/email/unsubscribeToken";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  const token = request.nextUrl.searchParams.get("token");

  if (!userId || !token || !verifyUserToken(userId, token)) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
  }

  await db
    .update(userSettings)
    .set({ emailFrequency: "paused", updatedAt: new Date() })
    .where(eq(userSettings.userId, userId));

  return new NextResponse(
    "<!doctype html><html><body style=\"font-family: sans-serif; max-width: 480px; margin: 80px auto;\"><h2>You're unsubscribed</h2><p>We've paused your job digest emails. You can turn them back on any time from your settings page.</p></body></html>",
    { headers: { "Content-Type": "text/html" } },
  );
}
