import { randomUUID } from "node:crypto";

import { getCacheClient } from "@siteyonetim/platform-cache";
import { Secret, TOTP } from "otpauth";

import { decryptTotpSecret, encryptTotpSecret } from "./totp-crypto";

const CHALLENGE_TTL_SECONDS = 5 * 60;
const BOOTSTRAP_TTL_SECONDS = 60;
const CHALLENGE_PREFIX = "auth:login-challenge:";
const BOOTSTRAP_PREFIX = "auth:login-bootstrap:";
const SEALED_TOKEN_PREFIX = "v1.";
const CHALLENGE_TOKEN_PREFIX = "c1.";
const MAX_ATTEMPTS = 5;

export type LoginChallengePhase = "verify" | "setup";

export type LoginChallenge = {
  userId: string;
  rememberMe: boolean;
  phase: LoginChallengePhase;
  attempts: number;
  pendingSecretEnc?: string;
};

export class LoginChallengeFailedError extends Error {
  readonly nextChallengeId: string;

  constructor(code: string, nextChallengeId: string) {
    super(code);
    this.name = "LoginChallengeFailedError";
    this.nextChallengeId = nextChallengeId;
  }
}

function hasDistributedCache(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL?.trim() && process.env.UPSTASH_REDIS_REST_TOKEN?.trim());
}

export type LoginBootstrap = {
  userId: string;
  rememberMe: boolean;
};

type SealedLoginBootstrap = LoginBootstrap & {
  exp: number;
  jti: string;
};

type SealedLoginChallenge = LoginChallenge & {
  exp: number;
  jti: string;
};

function sealPayload<T extends object>(prefix: string, payload: T, exp: number): string {
  return `${prefix}${encryptTotpSecret(JSON.stringify({ ...payload, exp }))}`;
}

function openSealedPayload<T extends { exp: number }>(token: string, prefix: string): T | null {
  if (!token.startsWith(prefix)) {
    return null;
  }
  try {
    const payload = JSON.parse(decryptTotpSecret(token.slice(prefix.length))) as T;
    if (typeof payload.exp !== "number" || payload.exp <= Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Self-contained sealed bootstrap tokens.
 * Server Actions and `/api/auth` handlers may run in different module instances,
 * so in-memory Maps are unreliable without Redis.
 */
export class LoginBootstrapStore {
  private cacheKey(jti: string) {
    return `${BOOTSTRAP_PREFIX}${jti}`;
  }

  async create(payload: LoginBootstrap): Promise<string> {
    const sealed: SealedLoginBootstrap = {
      ...payload,
      exp: Date.now() + BOOTSTRAP_TTL_SECONDS * 1000,
      jti: randomUUID(),
    };

    if (hasDistributedCache()) {
      await getCacheClient().set(this.cacheKey(sealed.jti), "1", BOOTSTRAP_TTL_SECONDS);
    }

    return sealPayload(SEALED_TOKEN_PREFIX, sealed, sealed.exp);
  }

  async consume(bootstrapId: string): Promise<LoginBootstrap | null> {
    const sealed = openSealedPayload<SealedLoginBootstrap>(bootstrapId, SEALED_TOKEN_PREFIX);
    if (!sealed?.userId || typeof sealed.jti !== "string") {
      return null;
    }

    if (hasDistributedCache()) {
      const alive = await getCacheClient().get<string>(this.cacheKey(sealed.jti));
      if (!alive) {
        return null;
      }
      await getCacheClient().del(this.cacheKey(sealed.jti));
    }

    return {
      userId: sealed.userId,
      rememberMe: Boolean(sealed.rememberMe),
    };
  }
}

export class LoginChallengeStore {
  private cacheKey(jti: string) {
    return `${CHALLENGE_PREFIX}${jti}`;
  }

  async create(challenge: Omit<LoginChallenge, "attempts">): Promise<string> {
    const sealed: SealedLoginChallenge = {
      ...challenge,
      attempts: 0,
      exp: Date.now() + CHALLENGE_TTL_SECONDS * 1000,
      jti: randomUUID(),
    };

    if (hasDistributedCache()) {
      await getCacheClient().set(this.cacheKey(sealed.jti), "1", CHALLENGE_TTL_SECONDS);
    }

    return sealPayload(CHALLENGE_TOKEN_PREFIX, sealed, sealed.exp);
  }

  async get(challengeId: string): Promise<LoginChallenge | null> {
    const sealed = openSealedPayload<SealedLoginChallenge>(challengeId, CHALLENGE_TOKEN_PREFIX);
    if (!sealed?.userId) {
      return null;
    }

    if (hasDistributedCache()) {
      const alive = await getCacheClient().get<string>(this.cacheKey(sealed.jti));
      if (!alive) {
        return null;
      }
    }

    return {
      userId: sealed.userId,
      rememberMe: sealed.rememberMe,
      phase: sealed.phase,
      attempts: sealed.attempts,
      pendingSecretEnc: sealed.pendingSecretEnc,
    };
  }

  async save(challengeId: string, challenge: LoginChallenge): Promise<string> {
    const previous = openSealedPayload<SealedLoginChallenge>(challengeId, CHALLENGE_TOKEN_PREFIX);
    const sealed: SealedLoginChallenge = {
      ...challenge,
      exp: previous?.exp ?? Date.now() + CHALLENGE_TTL_SECONDS * 1000,
      jti: previous?.jti ?? randomUUID(),
    };

    if (hasDistributedCache()) {
      await getCacheClient().set(this.cacheKey(sealed.jti), "1", CHALLENGE_TTL_SECONDS);
    }

    return sealPayload(CHALLENGE_TOKEN_PREFIX, sealed, sealed.exp);
  }

  async delete(challengeId: string): Promise<void> {
    const sealed = openSealedPayload<SealedLoginChallenge>(challengeId, CHALLENGE_TOKEN_PREFIX);
    if (!sealed || !hasDistributedCache()) {
      return;
    }
    await getCacheClient().del(this.cacheKey(sealed.jti));
  }
}

export function buildTotp(email: string, secret: Secret): TOTP {
  return new TOTP({
    issuer: "Site Yonetim",
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret,
  });
}

export function generateTotpSecret(): Secret {
  return new Secret({ size: 20 });
}

export function verifyTotpToken(totp: TOTP, token: string): boolean {
  const normalized = token.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) {
    return false;
  }
  return totp.validate({ token: normalized, window: 2 }) !== null;
}

export function getMaxTotpAttempts() {
  return MAX_ATTEMPTS;
}

export function safeDecryptTotpSecret(payload: string | null | undefined): string | null {
  if (!payload) {
    return null;
  }
  try {
    return decryptTotpSecret(payload);
  } catch {
    return null;
  }
}
