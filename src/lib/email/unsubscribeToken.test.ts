import { beforeEach, describe, expect, it } from "vitest";
import { signUserId, unsubscribeUrl, verifyUserToken } from "./unsubscribeToken";

const USER_ID = "11111111-2222-3333-4444-555555555555";

beforeEach(() => {
  process.env.UNSUBSCRIBE_SECRET = "test-secret";
  process.env.APP_BASE_URL = "https://example.com";
});

describe("unsubscribe tokens", () => {
  it("verifies a token it signed", () => {
    expect(verifyUserToken(USER_ID, signUserId(USER_ID))).toBe(true);
  });

  it("rejects a tampered token", () => {
    const token = signUserId(USER_ID);
    expect(verifyUserToken(USER_ID, token.slice(0, -1) + (token.endsWith("0") ? "1" : "0"))).toBe(false);
  });

  it("rejects a token signed for a different user", () => {
    const otherToken = signUserId("99999999-8888-7777-6666-555555555555");
    expect(verifyUserToken(USER_ID, otherToken)).toBe(false);
  });

  it("rejects tokens of the wrong length without throwing", () => {
    expect(verifyUserToken(USER_ID, "short")).toBe(false);
    expect(verifyUserToken(USER_ID, "")).toBe(false);
  });

  it("rejects tokens signed under a different secret", () => {
    const token = signUserId(USER_ID);
    process.env.UNSUBSCRIBE_SECRET = "rotated-secret";
    expect(verifyUserToken(USER_ID, token)).toBe(false);
  });

  it("builds an unsubscribe URL carrying a valid token", () => {
    const url = new URL(unsubscribeUrl(USER_ID));
    expect(url.pathname).toBe("/api/unsubscribe");
    expect(url.searchParams.get("userId")).toBe(USER_ID);
    expect(verifyUserToken(USER_ID, url.searchParams.get("token") ?? "")).toBe(true);
  });
});
