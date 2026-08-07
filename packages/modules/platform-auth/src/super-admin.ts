/** Fallback when SUPER_ADMIN_EMAIL env is unset (see DEVELOPMENT_RULES.md §33). */
export const DEFAULT_SUPER_ADMIN_EMAIL = "bora.bayraktar@hotmail.com";

export const DEFAULT_SUPER_ADMIN_NAME = "Platform Süper Admin";

export type SuperAdminSeedConfig = {
  email: string;
  password: string;
  name: string;
};

export function normalizeSuperAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getSuperAdminEmail(): string {
  const fromEnv = process.env.SUPER_ADMIN_EMAIL?.trim();
  return normalizeSuperAdminEmail(fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_SUPER_ADMIN_EMAIL);
}

export function isSuperAdminEmail(email: string): boolean {
  return normalizeSuperAdminEmail(email) === getSuperAdminEmail();
}

export function isSuperAdminUser(user: { isSuperAdmin?: boolean; email?: string } | null | undefined): boolean {
  if (!user) return false;
  if (user.isSuperAdmin === true) return true;
  if (user.email && isSuperAdminEmail(user.email)) return true;
  return false;
}

/** Seed / ops: requires SUPER_ADMIN_PASSWORD in environment; never read password from source code. */
export function parseSuperAdminSeedConfig(): SuperAdminSeedConfig | null {
  const password = process.env.SUPER_ADMIN_PASSWORD?.trim();
  if (!password) {
    return null;
  }
  if (password.length < 8) {
    throw new Error("SUPER_ADMIN_PASSWORD must be at least 8 characters");
  }

  const name = process.env.SUPER_ADMIN_NAME?.trim() || DEFAULT_SUPER_ADMIN_NAME;
  return {
    email: getSuperAdminEmail(),
    password,
    name,
  };
}
