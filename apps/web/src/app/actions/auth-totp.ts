"use server";

import { LoginChallengeFailedError } from "@siteyonetim/platform-auth";
import { getAuthService } from "@/lib/services";

import type { AdminLoginBeginResult } from "@siteyonetim/platform-auth";

export type AdminLoginBeginActionResult =
  | { ok: true; result: AdminLoginBeginResult; backupCodes?: string[] }
  | { ok: false; error: string };

export async function beginAdminLoginAction(input: {
  email: string;
  password: string;
  rememberMe: boolean;
}): Promise<AdminLoginBeginActionResult> {
  const email = input.email.trim();
  const password = input.password;
  if (!email || !password) {
    return { ok: false, error: "INVALID_CREDENTIALS" };
  }

  const result = await getAuthService().beginAdminLogin({
    email,
    password,
    rememberMe: input.rememberMe,
  });

  if (!result) {
    return { ok: false, error: "INVALID_CREDENTIALS" };
  }

  return { ok: true, result };
}

export async function completeLoginChallengeAction(input: {
  challengeId: string;
  code: string;
  useBackupCode?: boolean;
}): Promise<
  | { ok: true; bootstrapId: string; backupCodes: string[] }
  | { ok: false; error: string; nextChallengeId?: string }
> {
  try {
    const result = await getAuthService().completeLoginChallenge(input);
    if (!result) {
      return { ok: false, error: "INVALID_TOTP_CODE" };
    }
    return { ok: true, bootstrapId: result.bootstrapId, backupCodes: result.backupCodes };
  } catch (error) {
    if (error instanceof LoginChallengeFailedError) {
      return { ok: false, error: error.message, nextChallengeId: error.nextChallengeId };
    }
    if (error instanceof Error) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

export type TotpSecurityActionState = {
  error?: string;
  success?: boolean;
  otpauthUri?: string;
  enrollmentToken?: string;
  backupCodes?: string[];
};

export async function beginTotpEnrollmentAction(): Promise<TotpSecurityActionState> {
  const { auth } = await import("@/auth");
  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    return { error: "UNAUTHORIZED" };
  }

  try {
    const result = await getAuthService().beginEnrollmentForLoggedInUser(session.user.id);
    return {
      success: true,
      otpauthUri: result.otpauthUri,
      enrollmentToken: result.enrollmentToken,
    };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function confirmTotpEnrollmentAction(
  _prev: TotpSecurityActionState,
  formData: FormData,
): Promise<TotpSecurityActionState> {
  const { auth } = await import("@/auth");
  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    return { error: "UNAUTHORIZED" };
  }

  const enrollmentToken = String(formData.get("enrollmentToken") ?? "");
  const code = String(formData.get("code") ?? "");
  if (!enrollmentToken || !code) {
    return { error: "INVALID_TOTP_CODE" };
  }

  try {
    const result = await getAuthService().confirmEnrollmentForLoggedInUser(
      session.user.id,
      session.user.organizationId,
      enrollmentToken,
      code,
    );
    return { success: true, backupCodes: result.backupCodes };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function disableTotpAction(
  _prev: TotpSecurityActionState,
  formData: FormData,
): Promise<TotpSecurityActionState> {
  const { auth } = await import("@/auth");
  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    return { error: "UNAUTHORIZED" };
  }

  const password = String(formData.get("password") ?? "");
  const code = String(formData.get("code") ?? "");
  if (!password || !code) {
    return { error: "INVALID_TOTP_CODE" };
  }

  try {
    await getAuthService().disableTotp(session.user.id, session.user.organizationId, password, code);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function setOrgRequireTwoFactorAction(requireTwoFactor: boolean): Promise<TotpSecurityActionState> {
  const { auth } = await import("@/auth");
  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    return { error: "UNAUTHORIZED" };
  }

  try {
    await getAuthService().setOrganizationRequireTwoFactor(
      session.user.organizationId,
      requireTwoFactor,
      session.user.id,
    );
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    throw error;
  }
}
