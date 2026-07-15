import { describe, expect, it } from "vitest";
import { render } from "@react-email/render";
import { JobDigestEmail, type DigestJob } from "@/emails/JobDigestEmail";
// The Deno mirror's renderer is pure TS with no Deno APIs, so we test it here
// too and keep the two email variants honest against each other.
import { renderDigestHtml } from "../../../supabase/functions/_shared/digestEmailHtml";

const JOB: DigestJob = {
  title: "Senior Plumber",
  company: "Pipes & Co",
  location: "Austin TX",
  url: "https://example.com/job?jk=abc",
  score: 87,
  reasoning: "ok this one actually slaps, apply before someone worse than you gets it",
  salaryText: "$90k – $120k",
  experienceRequired: "3-5 years",
};

const UNSUB = "https://example.com/api/unsubscribe?userId=u&token=t";
const SETTINGS = "https://example.com/dashboard/settings";
const DASHBOARD = "https://example.com/dashboard";

describe("edge renderDigestHtml", () => {
  it("renders the job card with score, reasoning, and links", () => {
    const html = renderDigestHtml([JOB], UNSUB, SETTINGS, DASHBOARD, "rent dueeeee");
    expect(html).toContain("Senior Plumber");
    expect(html).toContain("Pipes &amp; Co");
    expect(html).toContain("87");
    expect(html).toContain(JOB.reasoning);
    // The & in the URL is correctly escaped to &amp; inside the href attribute.
    expect(html).toContain(UNSUB.replace("&", "&amp;"));
    expect(html).toContain(SETTINGS);
    expect(html).toContain(DASHBOARD);
    expect(html).toContain("Open your matches");
    expect(html).toContain("View on the site");
    expect(html).toContain("rent dueeeee");
  });

  it("falls back to a neutral heading without a taunt", () => {
    expect(renderDigestHtml([JOB], UNSUB, SETTINGS, DASHBOARD)).toContain("Your new matches");
  });

  it("escapes HTML in agent-supplied fields", () => {
    const hostile = { ...JOB, title: `<script>alert("pwn")</script>`, company: `a & b <i>` };
    const html = renderDigestHtml([hostile], UNSUB, SETTINGS, DASHBOARD);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("a &amp; b &lt;i&gt;");
  });

  it("pluralizes the count line", () => {
    expect(renderDigestHtml([JOB], UNSUB, SETTINGS, DASHBOARD)).toContain("1 job cleared");
    expect(
      renderDigestHtml([JOB, { ...JOB, url: "https://example.com/2" }], UNSUB, SETTINGS, DASHBOARD),
    ).toContain("2 jobs cleared");
  });
});

describe("React JobDigestEmail (Node sender)", () => {
  it("renders the same key content as the edge variant", async () => {
    const html = await render(
      JobDigestEmail({
        jobsList: [JOB],
        taunt: "rent dueeeee",
        unsubscribeUrl: UNSUB,
        settingsUrl: SETTINGS,
        dashboardUrl: DASHBOARD,
      }),
    );
    expect(html).toContain("Senior Plumber");
    expect(html).toContain("87");
    expect(html).toContain(JOB.reasoning);
    expect(html).toContain("rent dueeeee");
    // React escapes URLs' & as &amp; inside attributes; check the path instead.
    expect(html).toContain("/api/unsubscribe");
    expect(html).toContain("/dashboard/settings");
    expect(html).toContain("/dashboard");
    expect(html).toContain("Open your matches");
    expect(html).toContain("View on the site");
  });

  it("falls back to a neutral heading without a taunt", async () => {
    const html = await render(
      JobDigestEmail({
        jobsList: [JOB],
        unsubscribeUrl: UNSUB,
        settingsUrl: SETTINGS,
        dashboardUrl: DASHBOARD,
      }),
    );
    expect(html).toContain("Your new matches");
  });
});
