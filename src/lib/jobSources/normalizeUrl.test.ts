import { describe, expect, it } from "vitest";
import { normalizeUrl } from "./normalizeUrl";

describe("normalizeUrl", () => {
  it("keeps job-identifying query params", () => {
    expect(normalizeUrl("https://www.indeed.com/viewjob?jk=abc123")).toBe(
      "https://www.indeed.com/viewjob?jk=abc123",
    );
  });

  it("keeps distinct jobs distinct when only the query differs", () => {
    const a = normalizeUrl("https://www.indeed.com/viewjob?jk=abc123");
    const b = normalizeUrl("https://www.indeed.com/viewjob?jk=xyz789");
    expect(a).not.toBe(b);
  });

  it("strips utm_* params", () => {
    expect(
      normalizeUrl("https://example.com/job?jk=abc&utm_source=li&utm_medium=email"),
    ).toBe("https://example.com/job?jk=abc");
  });

  it("strips known tracking params case-insensitively", () => {
    expect(normalizeUrl("https://example.com/job?id=5&REF=share&gh_src=board")).toBe(
      "https://example.com/job?id=5",
    );
  });

  it("strips the hash fragment", () => {
    expect(normalizeUrl("https://example.com/job#apply")).toBe("https://example.com/job");
  });

  it("sorts remaining params so param order doesn't split the dedup key", () => {
    expect(normalizeUrl("https://example.com/job?b=2&a=1")).toBe(
      normalizeUrl("https://example.com/job?a=1&b=2"),
    );
  });

  it("leaves no dangling '?' when every param was tracking", () => {
    expect(normalizeUrl("https://example.com/job?utm_source=x")).toBe(
      "https://example.com/job",
    );
  });

  it("returns invalid URLs unchanged", () => {
    expect(normalizeUrl("not a url")).toBe("not a url");
  });
});
