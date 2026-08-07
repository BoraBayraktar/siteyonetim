"use server";

import { IncidentCategory, IncidentPriority, IncidentStatus } from "@siteyonetim/db";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { adminPropertyIncidentContext, adminPropertyMutateContext } from "@/lib/admin-action-context";
import { canMutateAdminData } from "@/lib/auth-context";
import { getIncidentService } from "@/lib/services";

export type IncidentActionState = { error?: string; success?: boolean };

const KNOWN_ERRORS = new Set([
  "UNAUTHORIZED",
  "INCIDENT_TITLE_REQUIRED",
  "INCIDENT_DESCRIPTION_REQUIRED",
  "INCIDENT_UNIT_INVALID",
  "PROPERTY_NOT_FOUND",
  "INCIDENT_NOT_FOUND",
  "INCIDENT_STATUS_TRANSITION_DENIED",
  "INCIDENT_ALREADY_CLOSED",
  "INCIDENT_EXPENSE_ALREADY_LINKED",
  "AMOUNT_INVALID",
  "CATEGORY_NOT_FOUND",
  "CATEGORY_TYPE_MISMATCH",
  "LEDGER_TARGET_REQUIRED",
  "CASHBOX_NOT_FOUND",
  "ACCOUNT_NOT_FOUND",
  "CASHBOX_INSUFFICIENT",
  "PERIOD_CLOSED",
]);

function revalidateIncidentPaths(locale: string, propertyId: string) {
  revalidatePath(`/${locale}/admin/properties/${propertyId}/incidents`, "page");
  revalidatePath(`/${locale}/staff/properties/${propertyId}/incidents`, "page");
  revalidatePath(`/${locale}/staff/properties/${propertyId}`, "page");
}

function revalidateFinancePaths(locale: string, propertyId: string) {
  revalidatePath(`/${locale}/admin/properties/${propertyId}/finance`, "page");
  revalidatePath(`/${locale}/admin/properties/${propertyId}/dues`, "page");
  revalidatePath(`/${locale}/admin/properties/${propertyId}/dashboard`, "page");
}

export async function createIncidentAction(
  locale: string,
  propertyId: string,
  _prev: IncidentActionState,
  formData: FormData,
): Promise<IncidentActionState> {
  const ctx = await adminPropertyIncidentContext(propertyId);
  if (!ctx) {
    return { error: "UNAUTHORIZED" };
  }

  const unitIdRaw = String(formData.get("unitId") ?? "").trim();

  try {
    await getIncidentService().create({
      ...ctx,
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      category: String(formData.get("category") ?? IncidentCategory.OTHER) as IncidentCategory,
      priority: String(formData.get("priority") ?? IncidentPriority.NORMAL) as IncidentPriority,
      unitId: unitIdRaw || null,
    });
    revalidateIncidentPaths(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error && KNOWN_ERRORS.has(error.message)) {
      return { error: error.message };
    }
    if (error instanceof Error) {
      console.error("createIncidentAction failed:", error.message);
    }
    return { error: "INCIDENT_SAVE_FAILED" };
  }
}

export async function updateIncidentStatusAction(
  locale: string,
  propertyId: string,
  incidentId: string,
  status: IncidentStatus,
): Promise<IncidentActionState> {
  const ctx = await adminPropertyIncidentContext(propertyId);
  if (!ctx) {
    return { error: "UNAUTHORIZED" };
  }

  const session = await auth();
  const managerOverride = canMutateAdminData(session);

  try {
    await getIncidentService().updateStatus({
      ...ctx,
      incidentId,
      status,
      managerOverride,
    });
    revalidateIncidentPaths(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error && KNOWN_ERRORS.has(error.message)) {
      return { error: error.message };
    }
    return { error: "INCIDENT_SAVE_FAILED" };
  }
}

export async function closeIncidentWithExpenseAction(
  locale: string,
  propertyId: string,
  incidentId: string,
  _prev: IncidentActionState,
  formData: FormData,
): Promise<IncidentActionState> {
  const ctx = await adminPropertyMutateContext(propertyId);
  if (!ctx) {
    return { error: "UNAUTHORIZED" };
  }

  try {
    await getIncidentService().closeWithExpense({
      ...ctx,
      incidentId,
      amount: String(formData.get("amount") ?? ""),
      categoryId: String(formData.get("categoryId") ?? ""),
      cashboxId: String(formData.get("cashboxId") ?? "") || null,
      financeAccountId: String(formData.get("financeAccountId") ?? "") || null,
      documentNo: String(formData.get("documentNo") ?? "") || null,
      description: String(formData.get("description") ?? "") || null,
    });
    revalidateIncidentPaths(locale, propertyId);
    revalidateFinancePaths(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error && KNOWN_ERRORS.has(error.message)) {
      return { error: error.message };
    }
    if (error instanceof Error) {
      console.error("closeIncidentWithExpenseAction failed:", error.message);
    }
    return { error: "INCIDENT_SAVE_FAILED" };
  }
}
