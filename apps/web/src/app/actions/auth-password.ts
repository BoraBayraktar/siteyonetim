"use server";

import { getAuthService } from "@/lib/services";
import { getAppBaseUrl } from "@/lib/app-url";

export type AuthPasswordActionState = {
  error?: string;
  success?: boolean;
  devResetUrl?: string;
};

export async function requestPasswordResetAction(
  _prev: AuthPasswordActionState,
  formData: FormData,
): Promise<AuthPasswordActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const locale = String(formData.get("locale") ?? "tr");

  if (!email) {
    return { error: "EMAIL_REQUIRED" };
  }

  const result = await getAuthService().requestPasswordReset({
    email,
    locale,
    appBaseUrl: getAppBaseUrl(),
  });

  return { success: true, devResetUrl: result.devResetUrl };
}

export async function resetPasswordAction(
  _prev: AuthPasswordActionState,
  formData: FormData,
): Promise<AuthPasswordActionState> {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const locale = String(formData.get("locale") ?? "tr");

  if (!token) {
    return { error: "INVALID_RESET_TOKEN" };
  }
  if (password.length < 8) {
    return { error: "PASSWORD_TOO_SHORT" };
  }
  if (password !== confirmPassword) {
    return { error: "PASSWORD_MISMATCH" };
  }

  try {
    await getAuthService().resetPassword({ token, password });
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "PASSWORD_TOO_SHORT") return { error: "PASSWORD_TOO_SHORT" };
      if (error.message === "INVALID_RESET_TOKEN") return { error: "INVALID_RESET_TOKEN" };
    }
    throw error;
  }
}
