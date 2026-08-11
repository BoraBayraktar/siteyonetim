import bcrypt from "bcryptjs";
import { createAuditService, type AuditServiceContract } from "@siteyonetim/platform-audit";

import type {
  AuthServiceContract,
  AuthSessionUserDto,
  AuthUserDto,
  BeginAdminLoginInput,
  CompleteLoginChallengeResult,
  ConfirmTotpEnrollmentResult,
  ConsumeLoginChallengeInput,
  ResetPasswordInput,
  RequestPasswordResetInput,
  TotpStatusDto,
  ValidateCredentialsInput,
} from "./contract";
import { AuthRepository, extractOrganizationId } from "./repository";
import { createPasswordResetService, PasswordResetService } from "./password-reset.service";
import { isSuperAdminUser } from "./super-admin";
import { createTotpService, TotpService } from "./totp.service";

export class AuthService implements AuthServiceContract {
  constructor(
    private readonly repository = new AuthRepository(),
    private readonly passwordReset: PasswordResetService = createPasswordResetService(),
    private readonly totp: TotpService = createTotpService(),
    private readonly audit: AuditServiceContract = createAuditService(),
  ) {}

  async validateCredentials(input: ValidateCredentialsInput): Promise<AuthUserDto | null> {
    const user = await this.repository.findByEmail(input.email.trim());
    if (!user) {
      // Unknown e-posta: hangi organizasyona ait olduğu bilinmediğinden AuditLog'a (organizationId zorunlu) yazılamaz.
      return null;
    }
    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      const organizationId = extractOrganizationId(user);
      if (organizationId) {
        await this.audit.record({
          organizationId,
          userId: user.id,
          action: "auth.login.failed",
          entityType: "User",
          entityId: user.id,
          metadata: { reason: "invalid_password" },
        });
      }
      return null;
    }
    const dto = isSuperAdminUser(user) ? await this.repository.toSuperAdminDto(user) : this.repository.toDto(user);
    if (dto) {
      await this.audit.record({
        organizationId: dto.organizationId,
        userId: dto.id,
        action: "auth.login.success",
        entityType: "User",
        entityId: dto.id,
        metadata: { sessionKind: dto.sessionKind },
      });
    }
    return dto;
  }

  async findUserById(userId: string): Promise<AuthUserDto | null> {
    const user = await this.repository.findById(userId);
    if (!user) {
      return null;
    }
    if (isSuperAdminUser(user)) {
      return this.repository.toSuperAdminDto(user);
    }
    return this.repository.toDto(user);
  }

  async requestPasswordReset(input: RequestPasswordResetInput) {
    return this.passwordReset.requestPasswordReset(input);
  }

  async resetPassword(input: ResetPasswordInput) {
    return this.passwordReset.resetPassword(input);
  }

  async beginAdminLogin(input: BeginAdminLoginInput) {
    return this.totp.beginAdminLogin(input, input.rememberMe);
  }

  async completeLoginChallenge(input: ConsumeLoginChallengeInput): Promise<CompleteLoginChallengeResult | null> {
    return this.totp.completeLoginChallenge(input);
  }

  async consumeLoginBootstrap(bootstrapId: string): Promise<AuthSessionUserDto | null> {
    return this.totp.consumeLoginBootstrap(bootstrapId);
  }

  async getTotpStatus(userId: string, organizationId: string): Promise<TotpStatusDto> {
    return this.totp.getTotpStatus(userId, organizationId);
  }

  async beginEnrollmentForLoggedInUser(userId: string) {
    return this.totp.beginEnrollmentForLoggedInUser(userId);
  }

  async confirmEnrollmentForLoggedInUser(
    userId: string,
    organizationId: string,
    enrollmentToken: string,
    code: string,
  ): Promise<ConfirmTotpEnrollmentResult> {
    return this.totp.confirmEnrollmentForLoggedInUser(userId, organizationId, enrollmentToken, code);
  }

  async disableTotp(userId: string, organizationId: string, password: string, code: string): Promise<void> {
    return this.totp.disableTotp(userId, organizationId, password, code);
  }

  async setOrganizationRequireTwoFactor(
    organizationId: string,
    requireTwoFactor: boolean,
    actorUserId: string,
  ): Promise<void> {
    return this.totp.setOrganizationRequireTwoFactor(organizationId, requireTwoFactor, actorUserId);
  }
}

export function createAuthService(): AuthService {
  return new AuthService();
}
