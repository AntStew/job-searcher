import { createHmac, timingSafeEqual } from "node:crypto";

function secret(): string {
  const value = process.env.UNSUBSCRIBE_SECRET;
  if (!value) throw new Error("UNSUBSCRIBE_SECRET is not set");
  return value;
}

export function signUserId(userId: string): string {
  return createHmac("sha256", secret()).update(userId).digest("hex");
}

export function verifyUserToken(userId: string, token: string): boolean {
  const expected = signUserId(userId);
  const expectedBuf = Buffer.from(expected);
  const tokenBuf = Buffer.from(token);
  if (expectedBuf.length !== tokenBuf.length) return false;
  return timingSafeEqual(expectedBuf, tokenBuf);
}

export function unsubscribeUrl(userId: string): string {
  const base = process.env.APP_BASE_URL ?? "";
  const token = signUserId(userId);
  return `${base}/api/unsubscribe?userId=${encodeURIComponent(userId)}&token=${token}`;
}
