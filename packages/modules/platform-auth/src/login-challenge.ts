import { randomUUID } from "node:crypto";

import { getCacheClient } from "@siteyonetim/platform-cache";
import { Secret, TOTP } from "otpauth";

import { decryptTotpSecret, encryptTotpSecret } from "./totp-crypto";

const CHALLENGE_TTL_SECONDS = 5 * 60;
const BOOTSTRAP_TTL_SECONDS = 60;
const CHALLENGE_PREFIX = "auth:login-challenge:";
const BOOTSTRAP_PREFIX = "auth:login-bootstrap:";
const BOOTSTRAP_TOKEN_PREFIX = "v1.";
const MAX_ATTEMPTS = 5;

export type LoginChallengePhase = "verify" | "setup";

export type LoginChallenge = {
  userId: string;
  rememberMe: boolean;
  phase: LoginChallengePhase;
  attempts: number;
  pendingSecretEnc?: string;
};

const devMemoryChallenges = new Map<string, { value: LoginChallenge; expiresAt: number }>();

function hasDistributedCache(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL?.trim() && process.env.UPSTASH_REDIS_REST_TOKEN?.trim());
}

function purgeExpiredDevChallenges() {
  const now = Date.now();
  for (const [key, entry] of devMemoryChallenges) {
    if (entry.expiresAt <= now) {
      devMemoryChallenges.delete(key);
    }
  }
}

export type LoginBootstrap = {
  userId: string;
  rememberMe: boolean;
};

type SealedLoginBootstrap = LoginBootstrap & {
  exp: number;
  jti: string;
};

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

    return `${BOOTSTRAP_TOKEN_PREFIX}${encryptTotpSecret(JSON.stringify(sealed))}`;
  }

  async consume(bootstrapId: string): Promise<LoginBootstrap | null> {
    if (!bootstrapId.startsWith(BOOTSTRAP_TOKEN_PREFIX)) {
      return null;
    }

    let sealed: SealedLoginBootstrap;
    try {
      sealed = JSON.parse(decryptTotpSecret(bootstrapId.slice(BOOTSTRAP_TOKEN_PREFIX.length))) as SealedLoginBootstrap;
    } catch {
      return null;
    }

    if (!sealed?.userId || typeof sealed.exp !== "number" || typeof sealed.jti !== "string") {
      return null;
    }
    if (sealed.exp <= Date.now()) {
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
  private cacheKey(challengeId: string) {
    return `${CHALLENGE_PREFIX}${challengeId}`;
  }

  async create(challenge: Omit<LoginChallenge, "attempts">): Promise<string> {
    const challengeId = randomUUID();
    const payload: LoginChallenge = { ...challenge, attempts: 0 };
    if (hasDistributedCache()) {
      await getCacheClient().set(this.cacheKey(challengeId), payload, CHALLENGE_TTL_SECONDS);
    } else {
      purgeExpiredDevChallenges();
      devMemoryChallenges.set(challengeId, {
        value: payload,
        expiresAt: Date.now() + CHALLENGE_TTL_SECONDS * 1000,
      });
    }
    return challengeId;
  }

  async get(challengeId: string): Promise<LoginChallenge | null> {
    if (hasDistributedCache()) {
      return getCacheClient().get<LoginChallenge>(this.cacheKey(challengeId));
    }
    purgeExpiredDevChallenges();
    const entry = devMemoryChallenges.get(challengeId);
    if (!entry || entry.expiresAt <= Date.now()) {
      devMemoryChallenges.delete(challengeId);
      return null;
    }
    return entry.value;
  }

  async save(challengeId: string, challenge: LoginChallenge): Promise<void> {
    if (hasDistributedCache()) {
      await getCacheClient().set(this.cacheKey(challengeId), challenge, CHALLENGE_TTL_SECONDS);
      return;
    }
    devMemoryChallenges.set(challengeId, {
      value: challenge,
      expiresAt: Date.now() + CHALLENGE_TTL_SECONDS * 1000,
    });
  }

  async delete(challengeId: string): Promise<void> {
    if (hasDistributedCache()) {
      await getCacheClient().del(this.cacheKey(challengeId));
      return;
    }
    devMemoryChallenges.delete(challengeId);
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
  return totp.validate({ token: normalized, window: 1 }) !== null;
}

export function getMaxTotpAttempts() {
  return MAX_ATTEMPTS;
}
