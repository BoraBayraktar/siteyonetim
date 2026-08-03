"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { getBankingService } from "@/lib/services";

export type BankingActionState = { error?: string; success?: boolean; matched?: number };

function revalidateBanking(locale: string, propertyId: string) {
  revalidatePath(`/${locale}/admin/properties/${propertyId}/reports`, "page");
}

async function adminContext() {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    return null;
  }
  return session;
}

export async function importBankStatementAction(
  locale: string,
  propertyId: string,
  _prev: BankingActionState,
  formData: FormData,
): Promise<BankingActionState> {
  const session = await adminContext();
  if (!session) return { error: "UNAUTHORIZED" };

  const file = formData.get("csvFile");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "BANK_CSV_FILE_REQUIRED" };
  }

  const csvContent = await file.text();
  const year = Number(formData.get("year") ?? new Date().getFullYear());
  const month = Number(formData.get("month") ?? new Date().getMonth() + 1);

  try {
    const result = await getBankingService().importCsv({
      organizationId: session.user.organizationId,
      propertyId,
      actorUserId: session.user.id,
      cashboxId: String(formData.get("cashboxId") ?? ""),
      fileName: file.name,
      year,
      month,
      csvContent,
    });
    revalidateBanking(locale, propertyId);
    return { success: true, matched: result.matchedOnImport };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function runAutoMatchFormAction(
  locale: string,
  propertyId: string,
  _prev: BankingActionState,
  formData: FormData,
): Promise<BankingActionState> {
  const importId = String(formData.get("importId") ?? "");
  if (!importId) return { error: "IMPORT_NOT_FOUND" };
  return runAutoMatchAction(locale, propertyId, importId);
}

export async function ignoreBankLineFormAction(
  locale: string,
  propertyId: string,
  _prev: BankingActionState,
  formData: FormData,
): Promise<BankingActionState> {
  const lineId = String(formData.get("lineId") ?? "");
  if (!lineId) return { error: "LINE_NOT_FOUND" };
  return ignoreBankLineAction(locale, propertyId, lineId);
}

async function runAutoMatchAction(
  locale: string,
  propertyId: string,
  importId: string,
): Promise<BankingActionState> {
  const session = await adminContext();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    const result = await getBankingService().runAutoMatch(
      {
        organizationId: session.user.organizationId,
        propertyId,
        actorUserId: session.user.id,
      },
      importId,
    );
    revalidateBanking(locale, propertyId);
    return { success: true, matched: result.matched };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function ignoreBankLineAction(
  locale: string,
  propertyId: string,
  lineId: string,
): Promise<BankingActionState> {
  const session = await adminContext();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    await getBankingService().ignoreLine(
      {
        organizationId: session.user.organizationId,
        propertyId,
        actorUserId: session.user.id,
      },
      lineId,
    );
    revalidateBanking(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function upsertBankWebhookProfileAction(
  locale: string,
  propertyId: string,
  _prev: BankingActionState,
  formData: FormData,
): Promise<BankingActionState> {
  const session = await adminContext();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    const providerKindRaw = String(formData.get("providerKind") ?? "WEBHOOK_PUSH");
    const providerKind =
      providerKindRaw === "GENERIC_REST_POLL" ? ("GENERIC_REST_POLL" as const) : ("WEBHOOK_PUSH" as const);
    const pollUrlRaw = String(formData.get("pollUrl") ?? "").trim();
    const restPollBearerTokenRaw = String(formData.get("restPollBearerToken") ?? "").trim();

    await getBankingService().upsertWebhookProfile({
      organizationId: session.user.organizationId,
      propertyId,
      actorUserId: session.user.id,
      enabled: formData.get("enabled") === "on",
      providerKind,
      cashboxId: String(formData.get("cashboxId") ?? "") || null,
      pollUrl: pollUrlRaw || null,
      restPollBearerToken: restPollBearerTokenRaw || null,
    });
    revalidateBanking(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function rotateBankWebhookSecretAction(
  locale: string,
  propertyId: string,
): Promise<{ error?: string; webhookSecret?: string }> {
  const session = await adminContext();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    const result = await getBankingService().rotateWebhookSecret({
      organizationId: session.user.organizationId,
      propertyId,
      actorUserId: session.user.id,
    });
    revalidateBanking(locale, propertyId);
    return { webhookSecret: result.webhookSecret };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    throw error;
  }
}
