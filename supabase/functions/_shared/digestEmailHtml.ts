export type DigestJob = {
  title: string;
  company: string;
  location: string | null;
  url: string;
  score: number;
  reasoning: string;
};

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
 * Keep the visual content in sync with the Node-side version.
 */
export function renderDigestHtml(jobsList: DigestJob[], unsubscribeUrl: string): string {
  const rows = jobsList
    .map(
      (job) => `
        <div style="margin-top:20px;">
          <p style="margin:0;font-weight:600;">
            <a href="${escapeHtml(job.url)}">${escapeHtml(job.title)}</a> — ${escapeHtml(job.company)}
          </p>
          <p style="margin:2px 0;color:#6b7280;font-size:14px;">
            ${escapeHtml(job.location ?? "Location unspecified")} · Match score: ${job.score}
          </p>
          <p style="margin:4px 0 0;font-size:14px;">${escapeHtml(job.reasoning)}</p>
          <hr style="margin-top:16px;" />
        </div>`,
    )
    .join("");

  return `<!doctype html>
<html>
  <head><meta charset="utf-8" /></head>
  <body style="font-family:sans-serif;background-color:#f9fafb;">
    <div style="background-color:#ffffff;padding:24px;border-radius:8px;max-width:600px;margin:0 auto;">
      <h2>Your job matches</h2>
      <p style="color:#6b7280;">${jobsList.length} job${jobsList.length === 1 ? "" : "s"} matched your preferences.</p>
      ${rows}
      <p style="color:#9ca3af;font-size:12px;margin-top:16px;">
        Want fewer (or no) emails? <a href="${escapeHtml(unsubscribeUrl)}">Change your email frequency</a>.
      </p>
    </div>
  </body>
</html>`;
}
