import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { verifyUserToken } from "@/lib/email/unsubscribeToken";

function page(body: string): NextResponse {
  return new NextResponse(
    `<!doctype html><html><body style="font-family: sans-serif; max-width: 480px; margin: 80px auto; color: #171a1c;">${body}</body></html>`,
    { headers: { "Content-Type": "text/html" } },
  );
}

function invalidLink(): NextResponse {
  return new NextResponse(JSON.stringify({ error: "Invalid or expired link" }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}

function getParams(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  const token = request.nextUrl.searchParams.get("token");
  if (!userId || !token || !verifyUserToken(userId, token)) return null;
  return { userId, token };
}

/**
 * Confirmation step. Email scanners and link prefetchers follow GETs, so the
 * GET must not change anything — a real person clicks the button, which POSTs.
 */
export async function GET(request: NextRequest) {
  const params = getParams(request);
  if (!params) return invalidLink();

  const action = `/api/unsubscribe?userId=${encodeURIComponent(params.userId)}&token=${encodeURIComponent(params.token)}`;
  return page(
    `<h2>Pause your job digest emails?</h2>
     <p>No more emails until you turn them back on from your settings page.</p>
     <form method="POST" action="${action}">
       <button type="submit" style="background: #0f8a7a; color: #fff; border: none; border-radius: 8px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer;">
         Yes, pause my emails
       </button>
     </form>`,
  );
}

export async function POST(request: NextRequest) {
  const params = getParams(request);
  if (!params) return invalidLink();

  await db
    .update(userSettings)
    .set({ emailFrequency: "paused", updatedAt: new Date() })
    .where(eq(userSettings.userId, params.userId));

  return page(
    `<h2>You're unsubscribed</h2>
     <p>We've paused your job digest emails. You can turn them back on any time from your settings page.</p>`,
  );
}
