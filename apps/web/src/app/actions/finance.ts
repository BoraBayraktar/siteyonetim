"use server";

import {
  FinanceAccountKind,
  FinanceCategoryType,
  LedgerEntryType,
} from "@siteyonetim/db";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { getFinanceService } from "@/lib/services";

export type FinanceActionState = { error?: string; success?: boolean };

function revalidateFinance(locale: string, propertyId: string) {
  revalidatePath(`/${locale}/admin/properties/${propertyId}/dues`, "page");
  revalidatePath(`/${locale}/admin/properties/${propertyId}/finance`, "page");
  revalidatePath(`/${locale}/admin/properties/${propertyId}/dashboard`, "page");
}

async function adminContext() {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    return null;
  }
  return session;
}

export async function createCategoryAction(
  locale: string,
  propertyId: string,
  _prev: FinanceActionState,
  formData: FormData,
): Promise<FinanceActionState> {
  const session = await adminContext();
  if (!session) return { error: "UNAUTHORIZED" };

  const type = String(formData.get("type") ?? FinanceCategoryType.EXPENSE) as FinanceCategoryType;
  try {
    await getFinanceService().createCategory({
      organizationId: session.user.organizationId,
      propertyId,
      name: String(formData.get("name") ?? ""),
      type,
      actorUserId: session.user.id,
    });
    revalidateFinance(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === "CATEGORY_NAME_REQUIRED") {
      return { error: error.message };
    }
    throw error;
  }
}

export async function createAccountAction(
  locale: string,
  propertyId: string,
  _prev: FinanceActionState,
  formData: FormData,
): Promise<FinanceActionState> {
  const session = await adminContext();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    await getFinanceService().createAccount({
      organizationId: session.user.organizationId,
      propertyId,
      code: String(formData.get("code") ?? ""),
      name: String(formData.get("name") ?? ""),
      kind: String(formData.get("kind") ?? FinanceAccountKind.GENERAL) as FinanceAccountKind,
      partyId: String(formData.get("partyId") ?? "") || null,
      actorUserId: session.user.id,
    });
    revalidateFinance(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === "ACCOUNT_FIELDS_REQUIRED") {
      return { error: error.message };
    }
    throw error;
  }
}

export async function createCashboxAction(
  locale: string,
  propertyId: string,
  _prev: FinanceActionState,
  formData: FormData,
): Promise<FinanceActionState> {
  const session = await adminContext();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    await getFinanceService().createCashbox({
      organizationId: session.user.organizationId,
      propertyId,
      name: String(formData.get("name") ?? ""),
      actorUserId: session.user.id,
    });
    revalidateFinance(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === "CASHBOX_NAME_REQUIRED") {
      return { error: error.message };
    }
    throw error;
  }
}

export async function createLedgerEntryAction(
  locale: string,
  propertyId: string,
  _prev: FinanceActionState,
  formData: FormData,
): Promise<FinanceActionState> {
  const session = await adminContext();
  if (!session) return { error: "UNAUTHORIZED" };

  const entryType = String(formData.get("entryType") ?? LedgerEntryType.EXPENSE) as LedgerEntryType;
  try {
    await getFinanceService().createLedgerEntry({
      organizationId: session.user.organizationId,
      propertyId,
      entryType,
      categoryId: String(formData.get("categoryId") ?? ""),
      amount: String(formData.get("amount") ?? ""),
      cashboxId: String(formData.get("cashboxId") ?? "") || null,
      financeAccountId: String(formData.get("financeAccountId") ?? "") || null,
      documentNo: String(formData.get("documentNo") ?? "") || null,
      description: String(formData.get("description") ?? "") || null,
      actorUserId: session.user.id,
    });
    revalidateFinance(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      const known = [
        "AMOUNT_INVALID",
        "CATEGORY_NOT_FOUND",
        "CATEGORY_TYPE_MISMATCH",
        "LEDGER_TARGET_REQUIRED",
        "CASHBOX_NOT_FOUND",
        "ACCOUNT_NOT_FOUND",
        "CASHBOX_INSUFFICIENT",
        "PERIOD_CLOSED",
      ];
      if (known.includes(error.message)) {
        return { error: error.message };
      }
    }
    throw error;
  }
}

export async function closePeriodAction(
  locale: string,
  propertyId: string,
  periodId: string,
): Promise<FinanceActionState> {
  const session = await adminContext();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    await getFinanceService().closePeriod(
      {
        organizationId: session.user.organizationId,
        propertyId,
        actorUserId: session.user.id,
      },
      periodId,
    );
    revalidateFinance(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error && ["PERIOD_NOT_FOUND", "PERIOD_ALREADY_CLOSED"].includes(error.message)) {
      return { error: error.message };
    }
    throw error;
  }
}
