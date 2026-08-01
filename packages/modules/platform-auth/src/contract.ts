import type { OrganizationRole } from "@siteyonetim/db";

export type SessionKind = "ADMIN" | "PORTAL";

export type AuthUserDto = {
  id: string;
  email: string;
  name: string;
  sessionKind: SessionKind;
  organizationId: string;
  organizationName: string;
  role?: OrganizationRole;
};

export type ValidateCredentialsInput = {
  email: string;
  password: string;
};

export type RequestPasswordResetInput = {
  email: string;
  locale: string;
  appBaseUrl: string;
};

export type ResetPasswordInput = {
  token: string;
  password: string;
};

export type PasswordResetResult = {
  ok: true;
  devResetUrl?: string;
};

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

export type BeginAdminLoginInput = ValidateCredentialsInput & {
  rememberMe: boolean;
};

export type ConsumeLoginChallengeInput = {
  challengeId: string;
  code: string;
  useBackupCode?: boolean;
};

export type AuthSessionUserDto = AuthUserDto & {
  rememberMe: boolean;
  setupBackupCodes?: string[];
};

export type CompleteLoginChallengeResult = {
  bootstrapId: string;
  backupCodes: string[];
};

export interface AuthServiceContract {
  validateCredentials(input: ValidateCredentialsInput): Promise<AuthUserDto | null>;
  findUserById(userId: string): Promise<AuthUserDto | null>;
  requestPasswordReset(input: RequestPasswordResetInput): Promise<PasswordResetResult>;
  resetPassword(input: ResetPasswordInput): Promise<PasswordResetResult>;
  beginAdminLogin(input: BeginAdminLoginInput): Promise<AdminLoginBeginResult | null>;
  completeLoginChallenge(input: ConsumeLoginChallengeInput): Promise<CompleteLoginChallengeResult | null>;
  consumeLoginBootstrap(bootstrapId: string): Promise<AuthSessionUserDto | null>;
  getTotpStatus(userId: string, organizationId: string): Promise<TotpStatusDto>;
  beginEnrollmentForLoggedInUser(userId: string): Promise<{ otpauthUri: string; enrollmentToken: string }>;
  confirmEnrollmentForLoggedInUser(
    userId: string,
    organizationId: string,
    enrollmentToken: string,
    code: string,
  ): Promise<ConfirmTotpEnrollmentResult>;
  disableTotp(userId: string, organizationId: string, password: string, code: string): Promise<void>;
  setOrganizationRequireTwoFactor(
    organizationId: string,
    requireTwoFactor: boolean,
    actorUserId: string,
  ): Promise<void>;
}
