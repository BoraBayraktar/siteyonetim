import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function generateWebhookSecret(): string {
  return randomBytes(32).toString("hex");
}

export function hashWebhookSecret(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

export function verifyWebhookSecret(secret: string, storedHash: string | null | undefined): boolean {
  if (!storedHash || !secret.trim()) {
    return false;
  }
  const candidate = hashWebhookSecret(secret.trim());
  const expected = Buffer.from(storedHash, "hex");
  const actual = Buffer.from(candidate, "hex");
  if (expected.length !== actual.length) {
    return false;
  }
  return timingSafeEqual(expected, actual);
}

export function extractBearerSecret(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return auth.slice("Bearer ".length).trim() || null;
  }
  const header = request.headers.get("x-bank-webhook-secret");
  return header?.trim() || null;
}
