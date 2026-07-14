import { Resend } from "npm:resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

/**
 * Notifies the affected user and the admin when a scheduled run fails.
 * Without this, a broken run just meant a user silently stopped getting
 * emails. Failures here are swallowed (alerting must never crash the run).
 * Note: on Resend's shared test domain, only the account owner's address
 * actually receives mail — both alerts land in the same inbox until a real
 * domain is verified.
 */
export async function sendErrorAlert(userEmail: string, errorSummary: string) {
  const from = Deno.env.get("EMAIL_FROM") ?? "Job Search Assistant <jobs@example.com>";
  const adminEmail = Deno.env.get("ADMIN_EMAIL");

  const recipients = new Set<string>([userEmail]);
  if (adminEmail) recipients.add(adminEmail);

  const html = `<!doctype html>
<html><body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;">
  <h2 style="margin:0 0 8px;">Your job search hit a snag</h2>
  <p style="color:#374151;">Today's automatic job search for <strong>${userEmail}</strong> didn't finish. No action needed — it will try again on the next scheduled run. If this keeps happening, reply to this email.</p>
  <p style="background:#f3f4f6;border-radius:8px;padding:12px;font-size:13px;color:#6b7280;font-family:monospace;">${errorSummary
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")}</p>
</body></html>`;

  try {
    await resend.emails.send({
      from,
      to: [...recipients],
      subject: "Job search run failed — will retry next time",
      html,
    });
  } catch (err) {
    console.error("[sendErrorAlert] failed to send alert:", err);
  }
}
