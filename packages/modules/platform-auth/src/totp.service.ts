import bcrypt from "bcryptjs";
import { createAuditService } from "@siteyonetim/platform-audit";
import { Secret } from "otpauth";

import type { AuthSessionUserDto, AuthUserDto, ValidateCredentialsInput } from "./contract";
import { AuthRepository } from "./repository";
import { isSuperAdminUser } from "./super-admin";
import {
  buildTotp,
  generateTotpSecret,
  getMaxTotpAttempts,
  LoginBootstrapStore,
  LoginChallengeFailedError,
  LoginChallengeStore,
  safeDecryptTotpSecret,
  verifyTotpToken,
} from "./login-challenge";
import { decryptTotpSecret, encryptTotpSecret } from "./totp-crypto";
import { TotpRepository } from "./totp.repository";

export type AdminLoginBeginResult =
  | { status: "direct" }
  | { status: "totp_required"; challengeId: string }
  | { status: "totp_setup_required"; challengeId: string; otpauthUri: string };

export type TotpStatusDto = {
  enabled: boolean;
  organizationRequiresTwoFactor: boolean;
};

export type ConfirmTotpEnrollmentResult = {
  backupCodes: string[];
};

export class TotpService {
  constructor(
    private readonly authRepository = new AuthRepository(),
    private readonly totpRepository = new TotpRepository(),
    private readonly challenges = new LoginChallengeStore(),
    private readonly bootstraps = new LoginBootstrapStore(),
    private readonly audit = createAuditService(),
  ) {}

  async getTotpStatus(userId: string, organizationId: string): Promise<TotpStatusDto> {
    const user = await this.totpRepository.findAdminUserById(userId);
    const organizationRequiresTwoFactor = await this.totpRepository.getOrganizationRequireTwoFactor(organizationId);
    return {
      enabled: Boolean(user?.totpEnabledAt && user.totpSecretEnc),
      organizationRequiresTwoFactor,
    };
  }

  async beginAdminLogin(input: ValidateCredentialsInput, rememberMe: boolean): Promise<AdminLoginBeginResult | null> {
    const user = await this.authRepository.validateAdminCredentials(input);
    if (!user) {
      return null;
    }

    if (user.isSuperAdmin) {
      return { status: "direct" };
    }

    const totpUser = await this.totpRepository.findAdminUserById(user.id);
    if (!totpUser) {
      return null;
    }

    const organizationRequiresTwoFactor = await this.totpRepository.getOrganizationRequireTwoFactor(user.organizationId);
    const totpEnabled = Boolean(totpUser.totpEnabledAt && totpUser.totpSecretEnc);

    if (totpEnabled) {
      const challengeId = await this.challenges.create({
        userId: user.id,
        rememberMe,
        phase: "verify",
      });
      return { status: "totp_required", challengeId };
    }

    if (organizationRequiresTwoFactor) {
      const secret = generateTotpSecret();
      const totp = buildTotp(totpUser.email, secret);
      const pendingSecretEnc = encryptTotpSecret(secret.base32);
      const challengeId = await this.challenges.create({
        userId: user.id,
        rememberMe,
        phase: "setup",
        pendingSecretEnc,
      });
      return {
        status: "totp_setup_required",
        challengeId,
        otpauthUri: totp.toString(),
      };
    }

    return { status: "direct" };
  }

  async completeLoginChallenge(input: {
    challengeId: string;
    code: string;
    useBackupCode?: boolean;
  }): Promise<{ bootstrapId: string; backupCodes: string[] } | null> {
    const sessionUser = await this.consumeLoginChallengeInternal(input);
    if (!sessionUser) {
      return null;
    }
    const bootstrapId = await this.bootstraps.create({
      userId: sessionUser.id,
      rememberMe: sessionUser.rememberMe,
    });
    return {
      bootstrapId,
      backupCodes: sessionUser.setupBackupCodes ?? [],
    };
  }

  async consumeLoginBootstrap(bootstrapId: string): Promise<AuthSessionUserDto | null> {
    const bootstrap = await this.bootstraps.consume(bootstrapId);
    if (!bootstrap) {
      return null;
    }
    const authUser = await this.authRepository.findById(bootstrap.userId);
    if (!authUser) {
      return null;
    }
    const dto = isSuperAdminUser(authUser)
      ? await this.authRepository.toSuperAdminDto(authUser)
      : this.authRepository.toDto(authUser);
    if (!dto || dto.sessionKind !== "ADMIN") {
      return null;
    }
    return { ...dto, rememberMe: bootstrap.rememberMe, isSuperAdmin: dto.isSuperAdmin };
  }

  private async consumeLoginChallengeInternal(input: {
    challengeId: string;
    code: string;
    useBackupCode?: boolean;
  }): Promise<(AuthUserDto & { rememberMe: boolean; setupBackupCodes?: string[] }) | null> {
    const challenge = await this.challenges.get(input.challengeId);
    if (!challenge) {
      throw new Error("INVALID_LOGIN_CHALLENGE");
    }

    if (challenge.attempts >= getMaxTotpAttempts()) {
      await this.challenges.delete(input.challengeId);
      throw new Error("TOTP_TOO_MANY_ATTEMPTS");
    }

    const user = await this.totpRepository.findAdminUserById(challenge.userId);
    if (!user) {
      await this.challenges.delete(input.challengeId);
      throw new Error("INVALID_LOGIN_CHALLENGE");
    }

    let verified = false;
    let setupBackupCodes: string[] | undefined;

    if (input.useBackupCode) {
      if (challenge.phase !== "verify") {
        throw new Error("INVALID_TOTP_CODE");
      }
      verified = await this.verifyBackupCode(user.id, user.totpBackupCodes, input.code);
    } else if (challenge.phase === "setup" && challenge.pendingSecretEnc) {
      const secretBase32 = safeDecryptTotpSecret(challenge.pendingSecretEnc);
      if (!secretBase32) {
        await this.challenges.delete(input.challengeId);
        throw new Error("INVALID_TOTP_ENROLLMENT");
      }
      const secret = Secret.fromBase32(secretBase32);
      verified = verifyTotpToken(buildTotp(user.email, secret), input.code);
      if (verified) {
        setupBackupCodes = this.totpRepository.generateBackupCodes();
        const backupHashes = await Promise.all(setupBackupCodes.map((code) => bcrypt.hash(code, 12)));
        await this.totpRepository.enableTotp(user.id, challenge.pendingSecretEnc, backupHashes);
        const authUser = await this.authRepository.findById(user.id);
        const organizationId = authUser?.organizations[0]?.organizationId ?? "";
        await this.audit.record({
          organizationId,
          userId: user.id,
          action: "auth.totp.enroll",
          entityType: "User",
          entityId: user.id,
        });
      }
    } else if (user.totpSecretEnc) {
      const secretBase32 = safeDecryptTotpSecret(user.totpSecretEnc);
      if (!secretBase32) {
        await this.challenges.delete(input.challengeId);
        throw new Error("TOTP_SECRET_DECRYPT_FAILED");
      }
      const secret = Secret.fromBase32(secretBase32);
      verified = verifyTotpToken(buildTotp(user.email, secret), input.code);
    }

    if (!verified) {
      const nextChallengeId = await this.challenges.save(input.challengeId, {
        ...challenge,
        attempts: challenge.attempts + 1,
      });
      throw new LoginChallengeFailedError("INVALID_TOTP_CODE", nextChallengeId);
    }

    await this.challenges.delete(input.challengeId);

    const authUser = await this.authRepository.findById(user.id);
    if (!authUser) {
      return null;
    }
    const dto = this.authRepository.toDto(authUser);
    if (!dto || dto.sessionKind !== "ADMIN") {
      return null;
    }

    return { ...dto, rememberMe: challenge.rememberMe, setupBackupCodes };
  }

  async beginEnrollmentForLoggedInUser(userId: string): Promise<{ otpauthUri: string; enrollmentToken: string }> {
    const user = await this.totpRepository.findAdminUserById(userId);
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }
    if (user.totpEnabledAt) {
      throw new Error("TOTP_ALREADY_ENABLED");
    }

    const secret = generateTotpSecret();
    const totp = buildTotp(user.email, secret);
    const pendingSecretEnc = encryptTotpSecret(secret.base32);
    const enrollmentToken = await this.challenges.create({
      userId,
      rememberMe: false,
      phase: "setup",
      pendingSecretEnc,
    });

    return { otpauthUri: totp.toString(), enrollmentToken };
  }

  async confirmEnrollmentForLoggedInUser(
    userId: string,
    organizationId: string,
    enrollmentToken: string,
    code: string,
  ): Promise<ConfirmTotpEnrollmentResult> {
    const challenge = await this.challenges.get(enrollmentToken);
    if (!challenge || challenge.userId !== userId || challenge.phase !== "setup" || !challenge.pendingSecretEnc) {
      throw new Error("INVALID_TOTP_ENROLLMENT");
    }

    const user = await this.totpRepository.findAdminUserById(userId);
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    const secret = Secret.fromBase32(decryptTotpSecret(challenge.pendingSecretEnc));
    if (!verifyTotpToken(buildTotp(user.email, secret), code)) {
      throw new Error("INVALID_TOTP_CODE");
    }

    const backupCodes = this.totpRepository.generateBackupCodes();
    const backupHashes = await Promise.all(backupCodes.map((item) => bcrypt.hash(item, 12)));
    await this.totpRepository.enableTotp(userId, challenge.pendingSecretEnc, backupHashes);
    await this.challenges.delete(enrollmentToken);

    await this.audit.record({
      organizationId,
      userId,
      action: "auth.totp.enroll",
      entityType: "User",
      entityId: userId,
    });

    return { backupCodes };
  }

  async disableTotp(userId: string, organizationId: string, password: string, code: string): Promise<void> {
    const authUser = await this.authRepository.findById(userId);
    if (!authUser) {
      throw new Error("USER_NOT_FOUND");
    }

    const validPassword = await bcrypt.compare(password, authUser.passwordHash);
    if (!validPassword) {
      throw new Error("INVALID_CREDENTIALS");
    }

    const user = await this.totpRepository.findAdminUserById(userId);
    if (!user?.totpSecretEnc) {
      throw new Error("TOTP_NOT_ENABLED");
    }

    const secret = Secret.fromBase32(decryptTotpSecret(user.totpSecretEnc));
    const validCode = verifyTotpToken(buildTotp(user.email, secret), code);
    if (!validCode) {
      throw new Error("INVALID_TOTP_CODE");
    }

    await this.totpRepository.disableTotp(userId);
    await this.audit.record({
      organizationId,
      userId,
      action: "auth.totp.disable",
      entityType: "User",
      entityId: userId,
    });
  }

  async setOrganizationRequireTwoFactor(
    organizationId: string,
    requireTwoFactor: boolean,
    actorUserId: string,
  ): Promise<void> {
    await this.totpRepository.setOrganizationRequireTwoFactor(organizationId, requireTwoFactor);
    await this.audit.record({
      organizationId,
      userId: actorUserId,
      action: "auth.totp.orgPolicy",
      entityType: "Organization",
      entityId: organizationId,
      metadata: { requireTwoFactor },
    });
  }

  private async verifyBackupCode(userId: string, raw: unknown, code: string): Promise<boolean> {
    const hashes = this.totpRepository.readBackupCodeHashes(raw);
    const normalized = code.replace(/\s/g, "").toUpperCase();
    for (let index = 0; index < hashes.length; index += 1) {
      const hash = hashes[index];
      if (await bcrypt.compare(normalized, hash)) {
        const remaining = hashes.filter((_, itemIndex) => itemIndex !== index);
        await this.totpRepository.updateBackupCodes(userId, remaining);
        return true;
      }
    }
    return false;
  }
}

export function createTotpService(): TotpService {
  return new TotpService();
}
