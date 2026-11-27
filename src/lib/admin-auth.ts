import crypto from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE_NAME = "bramwell_admin_session";

function getAdminSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || "bramwell-local-dev-secret-change-me";
}

export function getAdminPasscode(): string {
  return process.env.ADMIN_PASSCODE || "bramwell-admin";
}

function signPayload(payload: string): string {
  return crypto
    .createHmac("sha256", getAdminSecret())
    .update(payload)
    .digest("hex");
}

export function createAdminToken(): string {
  const issuedAt = String(Date.now());
  const sig = signPayload(issuedAt);
  return `${issuedAt}.${sig}`;
}

export function verifyAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [issuedAt, sig] = parts;
  if (!issuedAt || !sig) return false;

  const expectedSig = signPayload(issuedAt);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return false;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return false;

  const ageMs = Date.now() - Number(issuedAt);
  // 24h session window
  return Number.isFinite(ageMs) && ageMs >= 0 && ageMs < 24 * 60 * 60 * 1000;
}

export function checkPasscode(input: string): boolean {
  const expected = getAdminPasscode();
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminToken(token);
}
