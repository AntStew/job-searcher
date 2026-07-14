import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const whereMock = vi.fn();
vi.mock("@/db", () => ({
  db: {
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: whereMock })),
    })),
  },
}));

process.env.UNSUBSCRIBE_SECRET = "test-secret";

import { GET, POST } from "./route";
import { signUserId } from "@/lib/email/unsubscribeToken";

const USER_ID = "11111111-2222-3333-4444-555555555555";

function request(query: string, method: "GET" | "POST" = "GET"): NextRequest {
  return new NextRequest(`http://localhost/api/unsubscribe${query}`, { method });
}

function validQuery(): string {
  return `?userId=${USER_ID}&token=${signUserId(USER_ID)}`;
}

beforeEach(() => {
  whereMock.mockClear();
});

describe("GET /api/unsubscribe (confirmation page)", () => {
  it("rejects missing or invalid tokens", async () => {
    expect((await GET(request(""))).status).toBe(400);
    expect((await GET(request(`?userId=${USER_ID}&token=nope`))).status).toBe(400);
  });

  it("shows a confirm button and does NOT change anything", async () => {
    const res = await GET(request(validQuery()));
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Pause your job digest emails?");
    expect(html).toContain(`method="POST"`);
    // The whole point: mail scanners follow GETs, so a GET must be side-effect-free.
    expect(whereMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/unsubscribe (the actual pause)", () => {
  it("rejects invalid tokens without touching the DB", async () => {
    const res = await POST(request(`?userId=${USER_ID}&token=nope`, "POST"));
    expect(res.status).toBe(400);
    expect(whereMock).not.toHaveBeenCalled();
  });

  it("pauses emails with a valid token", async () => {
    const res = await POST(request(validQuery(), "POST"));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("You're unsubscribed");
    expect(whereMock).toHaveBeenCalledTimes(1);
  });
});
