import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
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
};

export function JobDigestEmail({
  jobsList,
  unsubscribeUrl,
}: {
  jobsList: DigestJob[];
  unsubscribeUrl: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>{`${jobsList.length} new job matches for you`}</Preview>
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "24px", borderRadius: "8px" }}>
          <Heading as="h2">Your job matches</Heading>
          <Text style={{ color: "#6b7280" }}>
            {jobsList.length} job{jobsList.length === 1 ? "" : "s"} matched your preferences.
          </Text>

          {jobsList.map((job, i) => (
            <Section key={job.url} style={{ marginTop: i === 0 ? "16px" : "20px" }}>
              <Text style={{ margin: 0, fontWeight: 600 }}>
                <Link href={job.url}>{job.title}</Link> — {job.company}
              </Text>
              <Text style={{ margin: "2px 0", color: "#6b7280", fontSize: "14px" }}>
                {job.location ?? "Location unspecified"} · Match score: {job.score}
              </Text>
              <Text style={{ margin: "4px 0 0", fontSize: "14px" }}>{job.reasoning}</Text>
              <Hr style={{ marginTop: "16px" }} />
            </Section>
          ))}

          <Text style={{ color: "#9ca3af", fontSize: "12px", marginTop: "16px" }}>
            Want fewer (or no) emails?{" "}
            <Link href={unsubscribeUrl}>Change your email frequency</Link>.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default JobDigestEmail;
