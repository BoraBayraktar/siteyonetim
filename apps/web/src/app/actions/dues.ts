"use server";

import { DueCalculationMode } from "@siteyonetim/db";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { getDuesService } from "@/lib/services";

export type DuesActionState = { error?: string; success?: boolean };

function revalidateDues(locale: string, propertyId: string) {
  revalidatePath(`/${locale}/admin/properties/${propertyId}/dues`, "page");
}

async function adminContext() {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    return null;
  }
  return session;
}

export async function createDueDefinitionAction(
  locale: string,
  propertyId: string,
  _prev: DuesActionState,
  formData: FormData,
): Promise<DuesActionState> {
  const session = await adminContext();
  if (!session) return { error: "UNAUTHORIZED" };

  const mode = String(formData.get("calculationMode") ?? DueCalculationMode.FIXED) as DueCalculationMode;
  try {
    await getDuesService().createDefinition({
      organizationId: session.user.organizationId,
      propertyId,
      name: String(formData.get("name") ?? ""),
      calculationMode: mode,
      fixedAmount: String(formData.get("fixedAmount") ?? "") || null,
      ratePerM2: String(formData.get("ratePerM2") ?? "") || null,
      actorUserId: session.user.id,
    });
    revalidateDues(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      const codes = ["DEFINITION_NAME_REQUIRED", "FIXED_AMOUNT_REQUIRED", "RATE_REQUIRED"];
      if (codes.includes(error.message)) return { error: error.message };
    }
    throw error;
  }
}

export async function generateAccrualAction(
  locale: string,
  propertyId: string,
  _prev: DuesActionState,
  formData: FormData,
): Promise<DuesActionState> {
  const session = await adminContext();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    await getDuesService().generateAccrual({
      organizationId: session.user.organizationId,
      propertyId,
      dueDefinitionId: String(formData.get("dueDefinitionId") ?? ""),
      year: Number(formData.get("year")),
      month: Number(formData.get("month")),
      actorUserId: session.user.id,
    });
    revalidateDues(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      const codes = [
        "DEFINITION_NOT_FOUND",
        "PERIOD_CLOSED",
        "NO_UNITS",
        "NO_ACCRUAL_LINES",
        "ACCRUAL_ALREADY_POSTED",
      ];
      if (codes.includes(error.message)) return { error: error.message };
    }
    throw error;
  }
}

export async function postAccrualAction(locale: string, propertyId: string, runId: string): Promise<DuesActionState> {
  const session = await adminContext();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    await getDuesService().postAccrual(
      {
        organizationId: session.user.organizationId,
        propertyId,
        actorUserId: session.user.id,
      },
      runId,
    );
    revalidateDues(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      const codes = ["RUN_NOT_FOUND", "ACCRUAL_ALREADY_POSTED", "PERIOD_CLOSED"];
      if (codes.includes(error.message)) return { error: error.message };
    }
    throw error;
  }
}

export async function recordDuePaymentAction(
  locale: string,
  propertyId: string,
  _prev: DuesActionState,
  formData: FormData,
): Promise<DuesActionState> {
  const session = await adminContext();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    await getDuesService().recordPayment({
      organizationId: session.user.organizationId,
      propertyId,
      cashboxId: String(formData.get("cashboxId") ?? ""),
      partyId: String(formData.get("partyId") ?? ""),
      amount: String(formData.get("amount") ?? ""),
      documentNo: String(formData.get("documentNo") ?? "") || null,
      description: String(formData.get("description") ?? "") || null,
      autoAllocate: true,
      actorUserId: session.user.id,
    });
    revalidateDues(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      const codes = [
        "AMOUNT_INVALID",
        "CASHBOX_NOT_FOUND",
        "PARTY_NOT_FOUND",
        "UNALLOCATED_AMOUNT",
        "ALLOCATION_SUM_MISMATCH",
        "LINE_NOT_FOUND",
        "ALLOCATION_EXCEEDS_REMAINING",
      ];
      if (codes.includes(error.message)) return { error: error.message };
    }
    throw error;
  }
}
