"use server";

import {
  FinanceAccountKind,
  FinanceCategoryType,
  LedgerEntryType,
} from "@siteyonetim/db";
import { revalidatePath } from "next/cache";

import { adminPropertyMutateContext } from "@/lib/admin-action-context";
import { getFinanceService } from "@/lib/services";

export type FinanceActionState = { error?: string; success?: boolean };

function revalidateFinance(locale: string, propertyId: string) {
  revalidatePath(`/${locale}/admin/properties/${propertyId}/dues`, "page");
  revalidatePath(`/${locale}/admin/properties/${propertyId}/finance`, "page");
  revalidatePath(`/${locale}/admin/properties/${propertyId}/dashboard`, "page");
}

export async function createCategoryAction(
  locale: string,
  propertyId: string,
  _prev: FinanceActionState,
  formData: FormData,
): Promise<FinanceActionState> {
  const ctx = await adminPropertyMutateContext(propertyId);
  if (!ctx) return { error: "UNAUTHORIZED" };

  const type = String(formData.get("type") ?? FinanceCategoryType.EXPENSE) as FinanceCategoryType;
  try {
    await getFinanceService().createCategory({
      organizationId: ctx.organizationId,
      propertyId: ctx.propertyId,
      name: String(formData.get("name") ?? ""),
      type,
      actorUserId: ctx.actorUserId,
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
  const ctx = await adminPropertyMutateContext(propertyId);
  if (!ctx) return { error: "UNAUTHORIZED" };

  try {
    await getFinanceService().createAccount({
      organizationId: ctx.organizationId,
      propertyId: ctx.propertyId,
      code: String(formData.get("code") ?? ""),
      name: String(formData.get("name") ?? ""),
      kind: String(formData.get("kind") ?? FinanceAccountKind.GENERAL) as FinanceAccountKind,
      partyId: String(formData.get("partyId") ?? "") || null,
      actorUserId: ctx.actorUserId,
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
  const ctx = await adminPropertyMutateContext(propertyId);
  if (!ctx) return { error: "UNAUTHORIZED" };

  try {
    await getFinanceService().createCashbox({
      organizationId: ctx.organizationId,
      propertyId: ctx.propertyId,
      name: String(formData.get("name") ?? ""),
      actorUserId: ctx.actorUserId,
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
  const ctx = await adminPropertyMutateContext(propertyId);
  if (!ctx) return { error: "UNAUTHORIZED" };

  const entryType = String(formData.get("entryType") ?? LedgerEntryType.EXPENSE) as LedgerEntryType;
  try {
    await getFinanceService().createLedgerEntry({
      organizationId: ctx.organizationId,
      propertyId: ctx.propertyId,
      entryType,
      categoryId: String(formData.get("categoryId") ?? ""),
      amount: String(formData.get("amount") ?? ""),
      cashboxId: String(formData.get("cashboxId") ?? "") || null,
      financeAccountId: String(formData.get("financeAccountId") ?? "") || null,
      documentNo: String(formData.get("documentNo") ?? "") || null,
      description: String(formData.get("description") ?? "") || null,
      actorUserId: ctx.actorUserId,
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
  const ctx = await adminPropertyMutateContext(propertyId);
  if (!ctx) return { error: "UNAUTHORIZED" };

  try {
    await getFinanceService().closePeriod(
      {
        organizationId: ctx.organizationId,
        propertyId: ctx.propertyId,
        actorUserId: ctx.actorUserId,
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
