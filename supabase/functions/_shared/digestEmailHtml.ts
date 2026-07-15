export type DigestJob = {
  title: string;
  company: string;
  location: string | null;
  url: string;
  score: number;
  reasoning: string;
  salaryText: string | null;
  experienceRequired: string | null;
};

const ACCENT = "#0f8a7a";
const ACCENT_SOFT = "#e6f5f2";
const INK = "#171a1c";
const MUTED = "#667085";
const BORDER = "#e2e5ea";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Plain-HTML equivalent of src/emails/JobDigestEmail.tsx. Written as a
 * template literal rather than a React Email component since Supabase Edge
 * Functions (Deno) would otherwise need a JSX toolchain just for this.
 * Keep the visual design in sync with the Node-side version.
 */
export function renderDigestHtml(
  jobsList: DigestJob[],
  unsubscribeUrl: string,
  settingsUrl: string,
  dashboardUrl: string,
  taunt?: string,
): string {
  const cards = jobsList
    .map((job) => {
      const meta =
        job.salaryText || job.experienceRequired
          ? `<p style="margin:10px 0 0;font-size:13px;color:${INK};">${
              job.salaryText ? `<strong>${escapeHtml(job.salaryText)}</strong>` : ""
            }${job.salaryText && job.experienceRequired ? "&nbsp;&nbsp;·&nbsp;&nbsp;" : ""}${
              job.experienceRequired ? escapeHtml(job.experienceRequired) : ""
            }</p>`
          : "";

      return `
      <div style="border:1px solid ${BORDER};border-radius:12px;padding:16px;margin-top:14px;">
        <table width="100%" cellpadding="0" cellspacing="0"><tbody><tr>
          <td>
            <a href="${escapeHtml(job.url)}" style="color:${INK};font-weight:600;font-size:15px;text-decoration:none;">${escapeHtml(job.title)}</a>
            <p style="margin:2px 0 0;color:${MUTED};font-size:13px;">${escapeHtml(job.company)}${job.location ? ` · ${escapeHtml(job.location)}` : ""}</p>
          </td>
          <td align="right" style="vertical-align:top;width:56px;">
            <div style="background-color:${ACCENT_SOFT};border-radius:10px;padding:6px 10px;text-align:center;">
              <div style="color:${INK};font-weight:700;font-size:15px;line-height:1;">${job.score}</div>
              <div style="color:${MUTED};font-size:9px;text-transform:uppercase;letter-spacing:.5px;">match</div>
            </div>
          </td>
        </tr></tbody></table>
        ${meta}
        <p style="margin:8px 0 12px;font-size:13px;color:${MUTED};line-height:1.5;">${escapeHtml(job.reasoning)}</p>
        <a href="${escapeHtml(job.url)}" style="display:inline-block;background-color:${ACCENT};color:#ffffff;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:600;text-decoration:none;">View job →</a>
      </div>`;
    })
    .join("");

  return `<!doctype html>
<html>
  <head><meta charset="utf-8" /></head>
  <body style="font-family:-apple-system,'Segoe UI',Roboto,sans-serif;background-color:#f5f6f8;margin:0;padding:24px 12px;">
    <div style="max-width:560px;margin:0 auto;">
      <div style="padding:0 4px 16px;">
        <table cellpadding="0" cellspacing="0"><tbody><tr>
          <td style="background-color:${ACCENT};border-radius:10px;width:36px;height:36px;text-align:center;color:#ffffff;font-weight:700;font-size:18px;">J</td>
          <td style="padding-left:10px;font-weight:600;font-size:16px;">
            <a href="${escapeHtml(dashboardUrl)}" style="color:${INK};text-decoration:none;">Unemployment Final Boss</a>
          </td>
        </tr></tbody></table>
      </div>
      <div style="background-color:#ffffff;border-radius:14px;border:1px solid ${BORDER};padding:24px;">
        <h2 style="margin:0 0 4px;color:${INK};font-size:20px;">${escapeHtml(taunt ?? "Your new matches")}</h2>
        <p style="margin:0 0 8px;color:${MUTED};font-size:14px;">${jobsList.length} job${jobsList.length === 1 ? "" : "s"} cleared your match threshold — best fits first.</p>
        ${cards}
        <div style="margin-top:20px;text-align:center;">
          <a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;background-color:${INK};color:#ffffff;border-radius:8px;padding:12px 20px;font-size:14px;font-weight:600;text-decoration:none;">Open your matches →</a>
        </div>
      </div>
      <p style="padding:16px 8px 0;text-align:center;color:#9ca3af;font-size:12px;margin:0;">
        <a href="${escapeHtml(dashboardUrl)}" style="color:${MUTED};">View on the site</a>
        &nbsp;·&nbsp;
        <a href="${escapeHtml(settingsUrl)}" style="color:${MUTED};">Update your preferences</a>
        &nbsp;·&nbsp;
        <a href="${escapeHtml(unsubscribeUrl)}" style="color:${MUTED};">Pause these emails</a>
      </p>
    </div>
  </body>
</html>`;
}
