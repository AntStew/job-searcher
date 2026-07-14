import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

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

export function JobDigestEmail({
  jobsList,
  taunt,
  unsubscribeUrl,
  settingsUrl,
}: {
  jobsList: DigestJob[];
  taunt?: string;
  unsubscribeUrl: string;
  settingsUrl: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>{`${jobsList.length} new job match${jobsList.length === 1 ? "" : "es"} picked for you`}</Preview>
      <Body style={{ fontFamily: "-apple-system, 'Segoe UI', Roboto, sans-serif", backgroundColor: "#f5f6f8", margin: 0, padding: "24px 12px" }}>
        <Container style={{ maxWidth: "560px", margin: "0 auto" }}>
          <Section style={{ padding: "0 4px 16px" }}>
            <table cellPadding={0} cellSpacing={0}>
              <tbody>
                <tr>
                  <td
                    style={{
                      backgroundColor: ACCENT,
                      borderRadius: "10px",
                      width: "36px",
                      height: "36px",
                      textAlign: "center",
                      color: "#ffffff",
                      fontWeight: 700,
                      fontSize: "18px",
                    }}
                  >
                    J
                  </td>
                  <td style={{ paddingLeft: "10px", color: INK, fontWeight: 600, fontSize: "16px" }}>
                    Unemployment Final Boss
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              border: `1px solid ${BORDER}`,
              padding: "24px",
            }}
          >
            <Heading as="h2" style={{ margin: "0 0 4px", color: INK, fontSize: "20px" }}>
              {taunt ?? "Your new matches"}
            </Heading>
            <Text style={{ margin: "0 0 8px", color: MUTED, fontSize: "14px" }}>
              {jobsList.length} job{jobsList.length === 1 ? "" : "s"} cleared your match threshold —
              best fits first.
            </Text>

            {jobsList.map((job) => (
              <Section
                key={job.url}
                style={{
                  border: `1px solid ${BORDER}`,
                  borderRadius: "12px",
                  padding: "16px",
                  marginTop: "14px",
                }}
              >
                <table width="100%" cellPadding={0} cellSpacing={0}>
                  <tbody>
                    <tr>
                      <td>
                        <Link
                          href={job.url}
                          style={{ color: INK, fontWeight: 600, fontSize: "15px", textDecoration: "none" }}
                        >
                          {job.title}
                        </Link>
                        <Text style={{ margin: "2px 0 0", color: MUTED, fontSize: "13px" }}>
                          {job.company}
                          {job.location ? ` · ${job.location}` : ""}
                        </Text>
                      </td>
                      <td align="right" style={{ verticalAlign: "top", width: "56px" }}>
                        <div
                          style={{
                            backgroundColor: ACCENT_SOFT,
                            borderRadius: "10px",
                            padding: "6px 10px",
                            textAlign: "center" as const,
                          }}
                        >
                          <div style={{ color: INK, fontWeight: 700, fontSize: "15px", lineHeight: "1" }}>
                            {job.score}
                          </div>
                          <div style={{ color: MUTED, fontSize: "9px", textTransform: "uppercase" as const, letterSpacing: "0.5px" }}>
                            match
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {(job.salaryText || job.experienceRequired) && (
                  <Text style={{ margin: "10px 0 0", fontSize: "13px", color: INK }}>
                    {job.salaryText ? <strong>{job.salaryText}</strong> : null}
                    {job.salaryText && job.experienceRequired ? "  ·  " : ""}
                    {job.experienceRequired ?? ""}
                  </Text>
                )}

                <Text style={{ margin: "8px 0 12px", fontSize: "13px", color: MUTED, lineHeight: "1.5" }}>
                  {job.reasoning}
                </Text>

                <Button
                  href={job.url}
                  style={{
                    backgroundColor: ACCENT,
                    color: "#ffffff",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  View job →
                </Button>
              </Section>
            ))}
          </Section>

          <Section style={{ padding: "16px 8px 0", textAlign: "center" as const }}>
            <Text style={{ color: "#9ca3af", fontSize: "12px", margin: 0 }}>
              <Link href={settingsUrl} style={{ color: MUTED }}>
                Update your preferences
              </Link>
              {"  ·  "}
              <Link href={unsubscribeUrl} style={{ color: MUTED }}>
                Pause these emails
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
