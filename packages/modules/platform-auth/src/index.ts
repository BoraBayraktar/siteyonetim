export type {
  AdminLoginBeginResult,
  AuthServiceContract,
  AuthSessionUserDto,
  AuthUserDto,
  BeginAdminLoginInput,
  CompleteLoginChallengeResult,
  ConfirmTotpEnrollmentResult,
  ConsumeLoginChallengeInput,
  RequestPasswordResetInput,
  ResetPasswordInput,
  TotpStatusDto,
  ValidateCredentialsInput,
} from "./contract";
export { createAuthService, AuthService } from "./service";
export {
  DEFAULT_SUPER_ADMIN_EMAIL,
  DEFAULT_SUPER_ADMIN_NAME,
  getSuperAdminEmail,
  isSuperAdminEmail,
  isSuperAdminUser,
  normalizeSuperAdminEmail,
  parseSuperAdminSeedConfig,
  type SuperAdminSeedConfig,
} from "./super-admin";
export { LoginChallengeFailedError } from "./login-challenge";
export {
  resolveSessionMaxAgeSeconds,
  SESSION_MAX_AGE_REMEMBER_SECONDS,
  SESSION_MAX_AGE_SECONDS,
} from "./session";
