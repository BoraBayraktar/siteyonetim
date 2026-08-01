import bcrypt from "bcryptjs";

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
import { AuthRepository } from "./repository";
import { createPasswordResetService, PasswordResetService } from "./password-reset.service";
import { createTotpService, TotpService } from "./totp.service";

export class AuthService implements AuthServiceContract {
  constructor(
    private readonly repository = new AuthRepository(),
    private readonly passwordReset: PasswordResetService = createPasswordResetService(),
    private readonly totp: TotpService = createTotpService(),
  ) {}

  async validateCredentials(input: ValidateCredentialsInput): Promise<AuthUserDto | null> {
    const user = await this.repository.findByEmail(input.email.trim());
    if (!user) {
      return null;
    }
    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      return null;
    }
    return this.repository.toDto(user);
  }

  async findUserById(userId: string): Promise<AuthUserDto | null> {
    const user = await this.repository.findById(userId);
    if (!user) {
      return null;
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
