"use server";

import { DueCalculationMode, LateFeeRateKind, SupplierLateFeeAllocationMode } from "@siteyonetim/db";
import { revalidatePath } from "next/cache";

import { adminPropertyMutateContext } from "@/lib/admin-action-context";
import { invalidatePropertyMonthlyInsightsForProperty } from "@/lib/invalidate-monthly-insights";
import { getDuesService } from "@/lib/services";

export type DuesActionState = { error?: string; success?: boolean; advanceAmount?: string };

function revalidateDues(locale: string, propertyId: string) {
  revalidatePath(`/${locale}/admin/properties/${propertyId}/dues`, "page");
  revalidatePath(`/${locale}/admin/properties/${propertyId}/dashboard`, "page");
  void invalidatePropertyMonthlyInsightsForProperty(propertyId);
}

export async function createDueDefinitionAction(
  locale: string,
  propertyId: string,
  _prev: DuesActionState,
  formData: FormData,
): Promise<DuesActionState> {
  const ctx = await adminPropertyMutateContext(propertyId);
  if (!ctx) return { error: "UNAUTHORIZED" };

  const mode = String(formData.get("calculationMode") ?? DueCalculationMode.FIXED) as DueCalculationMode;
  try {
    await getDuesService().createDefinition({
      organizationId: ctx.organizationId,
      propertyId,
      name: String(formData.get("name") ?? ""),
      calculationMode: mode,
      fixedAmount: String(formData.get("fixedAmount") ?? "") || null,
      ratePerM2: String(formData.get("ratePerM2") ?? "") || null,
      meterKind: (String(formData.get("meterKind") ?? "") || null) as import("@siteyonetim/db").MeterKind | null,
      supplierLateFeeAllocationMode:
        (String(formData.get("supplierLateFeeAllocationMode") ?? "") || null) as SupplierLateFeeAllocationMode | null,
      autoAccrualMonthly:
        mode === DueCalculationMode.SUPPLIER_LATE_FEE_BILL ? false : formData.get("autoAccrualMonthly") === "on",
      actorUserId: ctx.actorUserId,
    });
    revalidateDues(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      const codes = [
        "DEFINITION_NAME_REQUIRED",
        "DEFINITION_NAME_DUPLICATE",
        "FIXED_AMOUNT_REQUIRED",
        "RATE_REQUIRED",
        "SHARE_POOL_REQUIRED",
        "METER_KIND_REQUIRED",
        "SUPPLIER_LATE_FEE_MODE_REQUIRED",
      ];
      if (codes.includes(error.message)) return { error: error.message };
    }
    throw error;
  }
}

export async function updateDueDefinitionAction(
  locale: string,
  propertyId: string,
  definitionId: string,
  _prev: DuesActionState,
  formData: FormData,
): Promise<DuesActionState> {
  const ctx = await adminPropertyMutateContext(propertyId);
  if (!ctx) return { error: "UNAUTHORIZED" };

  const mode = String(formData.get("calculationMode") ?? DueCalculationMode.FIXED) as DueCalculationMode;
  try {
    await getDuesService().updateDefinition({
      organizationId: ctx.organizationId,
      propertyId,
      definitionId,
      name: String(formData.get("name") ?? ""),
      calculationMode: mode,
      fixedAmount: String(formData.get("fixedAmount") ?? "") || null,
      ratePerM2: String(formData.get("ratePerM2") ?? "") || null,
      meterKind: (String(formData.get("meterKind") ?? "") || null) as import("@siteyonetim/db").MeterKind | null,
      supplierLateFeeAllocationMode:
        (String(formData.get("supplierLateFeeAllocationMode") ?? "") || null) as SupplierLateFeeAllocationMode | null,
      autoAccrualMonthly:
        mode === DueCalculationMode.SUPPLIER_LATE_FEE_BILL ? false : formData.get("autoAccrualMonthly") === "on",
      actorUserId: ctx.actorUserId,
    });
    revalidateDues(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      const codes = [
        "DEFINITION_NAME_REQUIRED",
        "DEFINITION_NAME_DUPLICATE",
        "DEFINITION_NOT_FOUND",
        "FIXED_AMOUNT_REQUIRED",
        "RATE_REQUIRED",
        "SHARE_POOL_REQUIRED",
        "METER_KIND_REQUIRED",
        "SUPPLIER_LATE_FEE_MODE_REQUIRED",
        "CALCULATION_MODE_CHANGE_NOT_ALLOWED",
      ];
      if (codes.includes(error.message)) return { error: error.message };
    }
    throw error;
  }
}

export async function setDefinitionAutoAccrualAction(
  locale: string,
  propertyId: string,
  definitionId: string,
  _prev: DuesActionState,
  formData: FormData,
): Promise<DuesActionState> {
  const ctx = await adminPropertyMutateContext(propertyId);
  if (!ctx) return { error: "UNAUTHORIZED" };
  const enabled = formData.get("autoAccrualMonthly") === "true";
  try {
    await getDuesService().setDefinitionAutoAccrual(
      {
        organizationId: ctx.organizationId,
        propertyId,
        actorUserId: ctx.actorUserId,
      },
      definitionId,
      enabled,
    );
    revalidateDues(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      const codes = ["DEFINITION_NOT_FOUND", "SUPPLIER_LATE_FEE_AUTO_ACCRUAL_NOT_ALLOWED"];
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
  const ctx = await adminPropertyMutateContext(propertyId);
  if (!ctx) return { error: "UNAUTHORIZED" };

  try {
    await getDuesService().generateAccrual({
      organizationId: ctx.organizationId,
      propertyId,
      dueDefinitionId: String(formData.get("dueDefinitionId") ?? ""),
      year: Number(formData.get("year")),
      month: Number(formData.get("month")),
      totalBillAmount: String(formData.get("totalBillAmount") ?? "") || null,
      totalBillConsumptionM3: String(formData.get("totalBillConsumptionM3") ?? "") || null,
      supplierLateFeeAllocationMode:
        (String(formData.get("supplierLateFeeAllocationMode") ?? "") || null) as SupplierLateFeeAllocationMode | null,
      supplierReference: String(formData.get("supplierReference") ?? "") || null,
      actorUserId: ctx.actorUserId,
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
        "TOTAL_BILL_REQUIRED",
        "AMOUNT_INVALID",
        "METER_KIND_REQUIRED",
        "RATE_REQUIRED",
        "NO_METER_CONSUMPTION",
        "INCOMPLETE_METER_READINGS",
        "TOTAL_BILL_CONSUMPTION_REQUIRED",
        "BILL_CONSUMPTION_INVALID",
        "BILL_CONSUMPTION_MISMATCH",
        "SUPPLIER_LATE_FEE_MODE_REQUIRED",
        "SUPPLIER_LATE_FEE_NO_DELINQUENT_UNITS",
      ];
      if (codes.includes(error.message)) return { error: error.message };
    }
    throw error;
  }
}

export async function recalculateAccrualAction(
  locale: string,
  propertyId: string,
  runId: string,
  _prev: DuesActionState,
  formData: FormData,
): Promise<DuesActionState> {
  const ctx = await adminPropertyMutateContext(propertyId);
  if (!ctx) return { error: "UNAUTHORIZED" };

  try {
    await getDuesService().recalculateAccrual({
      organizationId: ctx.organizationId,
      propertyId,
      runId,
      totalBillAmount: String(formData.get("totalBillAmount") ?? "") || null,
      totalBillConsumptionM3: String(formData.get("totalBillConsumptionM3") ?? "") || null,
      actorUserId: ctx.actorUserId,
    });
    revalidateDues(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      const codes = [
        "RUN_NOT_FOUND",
        "PERIOD_CLOSED",
        "TOTAL_BILL_REQUIRED",
        "AMOUNT_INVALID",
        "NO_METER_CONSUMPTION",
        "INCOMPLETE_METER_READINGS",
        "NO_ACCRUAL_LINES",
        "RECALCULATE_METER_BILL_ONLY",
        "ACCRUAL_HAS_PAYMENTS",
        "ACCRUAL_HAS_LATE_FEES",
        "TOTAL_BILL_CONSUMPTION_REQUIRED",
        "BILL_CONSUMPTION_INVALID",
        "BILL_CONSUMPTION_MISMATCH",
      ];
      if (codes.includes(error.message)) return { error: error.message };
    }
    throw error;
  }
}

export async function voidPostedAccrualAction(
  locale: string,
  propertyId: string,
  runId: string,
): Promise<DuesActionState> {
  const ctx = await adminPropertyMutateContext(propertyId);
  if (!ctx) return { error: "UNAUTHORIZED" };

  try {
    await getDuesService().voidPostedAccrual(
      {
        organizationId: ctx.organizationId,
        propertyId,
        actorUserId: ctx.actorUserId,
      },
      runId,
    );
    revalidateDues(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      const codes = [
        "RUN_NOT_FOUND",
        "PERIOD_CLOSED",
        "ACCRUAL_HAS_PAYMENTS",
        "ACCRUAL_HAS_LATE_FEES",
      ];
      if (codes.includes(error.message)) return { error: error.message };
    }
    throw error;
  }
}

export async function supplementPostedAccrualAction(
  locale: string,
  propertyId: string,
  runId: string,
): Promise<DuesActionState> {
  const ctx = await adminPropertyMutateContext(propertyId);
  if (!ctx) return { error: "UNAUTHORIZED" };

  try {
    await getDuesService().supplementPostedAccrual(
      {
        organizationId: ctx.organizationId,
        propertyId,
        actorUserId: ctx.actorUserId,
      },
      runId,
    );
    revalidateDues(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      const codes = [
        "RUN_NOT_FOUND",
        "PERIOD_CLOSED",
        "SUPPLEMENT_MODE_NOT_SUPPORTED",
        "NO_MISSING_UNITS",
        "NO_UNITS",
        "NO_ACCRUAL_LINES",
        "METER_KIND_REQUIRED",
        "NO_METER_CONSUMPTION",
        "INCOMPLETE_METER_READINGS",
      ];
      if (codes.includes(error.message)) return { error: error.message };
    }
    throw error;
  }
}

export async function postAccrualAction(locale: string, propertyId: string, runId: string): Promise<DuesActionState> {
  const ctx = await adminPropertyMutateContext(propertyId);
  if (!ctx) return { error: "UNAUTHORIZED" };

  try {
    await getDuesService().postAccrual(
      {
        organizationId: ctx.organizationId,
        propertyId,
        actorUserId: ctx.actorUserId,
      },
      runId,
    );
    revalidateDues(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      const codes = [
        "RUN_NOT_FOUND",
        "ACCRUAL_ALREADY_POSTED",
        "PERIOD_CLOSED",
        "ACCRUAL_INCOMPLETE",
        "TOTAL_BILL_REQUIRED",
        "TOTAL_BILL_CONSUMPTION_REQUIRED",
        "BILL_CONSUMPTION_MISMATCH",
        "NO_METER_CONSUMPTION",
        "INCOMPLETE_METER_READINGS",
        "SUPPLIER_LATE_FEE_MODE_REQUIRED",
        "AMOUNT_INVALID",
        "NO_UNITS",
      ];
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
  const ctx = await adminPropertyMutateContext(propertyId);
  if (!ctx) return { error: "UNAUTHORIZED" };

  try {
    const lineId = String(formData.get("dueAccrualLineId") ?? "") || null;
    const allocationsJson = String(formData.get("allocationsJson") ?? "").trim();
    const amount = String(formData.get("amount") ?? "");
    const autoAllocateField = formData.get("autoAllocate");
    const paymentDateRaw = String(formData.get("paymentDate") ?? "").trim();

    let allocations =
      allocationsJson.length > 0
        ? (JSON.parse(allocationsJson) as Array<{ dueAccrualLineId: string; amount: string }>)
        : undefined;
    const autoAllocate =
      allocations && allocations.length > 0 ? false : lineId ? false : autoAllocateField !== "off";

    if (!allocations && lineId) {
      allocations = [{ dueAccrualLineId: lineId, amount }];
    }

    const result = await getDuesService().recordPayment({
      organizationId: ctx.organizationId,
      propertyId,
      cashboxId: String(formData.get("cashboxId") ?? ""),
      partyId: String(formData.get("partyId") ?? ""),
      unitId: String(formData.get("unitId") ?? "") || null,
      amount,
      paymentDate: paymentDateRaw ? new Date(paymentDateRaw) : undefined,
      documentNo: String(formData.get("documentNo") ?? "") || null,
      description: String(formData.get("description") ?? "") || null,
      autoAllocate,
      allowAdvance: formData.get("allowAdvance") !== "off",
      allocations,
      actorUserId: ctx.actorUserId,
    });
    revalidateDues(locale, propertyId);
    return {
      success: true,
      advanceAmount: result.advanceAmount !== "0" ? result.advanceAmount : undefined,
    };
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

export async function upsertLateFeePolicyAction(
  locale: string,
  propertyId: string,
  _prev: DuesActionState,
  formData: FormData,
): Promise<DuesActionState> {
  const ctx = await adminPropertyMutateContext(propertyId);
  if (!ctx) return { error: "UNAUTHORIZED" };
  try {
    const mode = String(formData.get("lateFeeMode") ?? "NONE");
    const active = mode !== "NONE";
    const rateKind = (
      mode === LateFeeRateKind.LEGAL_TCMB ? LateFeeRateKind.LEGAL_TCMB : LateFeeRateKind.CONTRACTUAL
    ) as LateFeeRateKind;
    await getDuesService().upsertLateFeePolicy({
      organizationId: ctx.organizationId,
      propertyId,
      rateKind,
      active,
      monthlyRatePercent: String(formData.get("monthlyRatePercent") ?? ""),
      graceDays: Number(formData.get("graceDays") ?? 0),
      dueDayOfMonth: Number(formData.get("dueDayOfMonth") ?? 1),
      actorUserId: ctx.actorUserId,
    });
    revalidateDues(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === "LATE_FEE_RATE_INVALID") {
      return { error: error.message };
    }
    throw error;
  }
}

export async function applyLateFeesAction(
  locale: string,
  propertyId: string,
  _prev: DuesActionState,
  formData: FormData,
): Promise<DuesActionState> {
  const ctx = await adminPropertyMutateContext(propertyId);
  if (!ctx) return { error: "UNAUTHORIZED" };
  try {
    await getDuesService().applyLateFees({
      organizationId: ctx.organizationId,
      propertyId,
      year: Number(formData.get("year")),
      month: Number(formData.get("month")),
      actorUserId: ctx.actorUserId,
    });
    revalidateDues(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      const codes = ["LATE_FEE_POLICY_MISSING", "PERIOD_CLOSED", "ACCRUAL_ALREADY_POSTED", "LEGAL_RATE_MISSING"];
      if (codes.includes(error.message)) return { error: error.message };
    }
    throw error;
  }
}

export async function getUnitDebtDetailAction(
  propertyId: string,
  unitId: string,
  period?: { year: number; month: number },
) {
  const ctx = await adminPropertyMutateContext(propertyId);
  if (!ctx) return null;

  return getDuesService().getUnitDebtDetail(
    {
      organizationId: ctx.organizationId,
      propertyId,
      actorUserId: ctx.actorUserId,
    },
    unitId,
    period,
  );
}
