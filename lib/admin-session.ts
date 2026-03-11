import { createHash, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "admin_session";

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function getExpectedAdminSessionToken(): string | null {
  const password = process.env.ADMIN_DASHBOARD_PASSWORD;
  if (!password) {
    return null;
  }
  return sha256(password);
}

export function isValidAdminSessionToken(token: string | undefined): boolean {
  if (!token) {
    return false;
  }

  const expected = getExpectedAdminSessionToken();
  if (!expected) {
    return false;
  }

  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);

  if (tokenBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(tokenBuffer, expectedBuffer);
}
