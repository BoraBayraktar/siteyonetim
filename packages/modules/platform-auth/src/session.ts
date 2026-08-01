export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
export const SESSION_MAX_AGE_REMEMBER_SECONDS = 30 * 24 * 60 * 60;
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export function resolveSessionMaxAgeSeconds(rememberMe: boolean): number {
  return rememberMe ? SESSION_MAX_AGE_REMEMBER_SECONDS : SESSION_MAX_AGE_SECONDS;
}
