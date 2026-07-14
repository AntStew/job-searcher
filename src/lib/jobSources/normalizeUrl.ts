// Query params that only say where a click came from — safe to strip when
// deduping jobs by URL. The rest of the query string must survive: many job
// boards identify the posting itself by a query param (e.g.
// indeed.com/viewjob?jk=abc123), so stripping the whole query would collapse
// distinct jobs into one dedup key and attach matches to the wrong job.
const TRACKING_PARAMS = new Set([
  "ref",
  "refid",
  "ref_id",
  "referer",
  "referrer",
  "src",
  "source",
  "trk",
  "trackingid",
  "tracking_id",
  "gh_src",
  "lever-source",
  "cid",
  "mkt_tok",
  "fbclid",
  "gclid",
]);

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    for (const key of [...u.searchParams.keys()]) {
      const lower = key.toLowerCase();
      if (lower.startsWith("utm_") || TRACKING_PARAMS.has(lower)) {
        u.searchParams.delete(key);
      }
    }
    u.searchParams.sort();
    // URL serializes a bare "?" when the last param was deleted — drop it.
    return u.toString().replace(/\?$/, "");
  } catch {
    return url;
  }
}
