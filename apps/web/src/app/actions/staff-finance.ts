"use server";

import { StaffEmploymentStatus, StaffMovementType } from "@siteyonetim/db";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { getStaffFinanceService } from "@/lib/services";

export type StaffFinanceActionState = { error?: string; success?: boolean };

function revalidateStaffFinance(locale: string, propertyId: string) {
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

export async function createStaffProfileAction(
  locale: string,
  propertyId: string,
  _prev: StaffFinanceActionState,
  formData: FormData,
): Promise<StaffFinanceActionState> {
  const session = await adminContext();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    await getStaffFinanceService().createStaffProfile({
      organizationId: session.user.organizationId,
      propertyId,
      partyId: String(formData.get("partyId") ?? ""),
      staffNo: String(formData.get("staffNo") ?? "") || null,
      title: String(formData.get("title") ?? "") || null,
      department: String(formData.get("department") ?? "") || null,
      actorUserId: session.user.id,
    });
    revalidateStaffFinance(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      const known = ["PARTY_NOT_FOUND", "STAFF_PROFILE_EXISTS"];
      if (known.includes(error.message)) return { error: error.message };
    }
    throw error;
  }
}

export async function updateStaffProfileAction(
  locale: string,
  propertyId: string,
  staffProfileId: string,
  _prev: StaffFinanceActionState,
  formData: FormData,
): Promise<StaffFinanceActionState> {
  const session = await adminContext();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    await getStaffFinanceService().updateStaffProfile({
      organizationId: session.user.organizationId,
      propertyId,
      staffProfileId,
      staffNo: String(formData.get("staffNo") ?? "") || null,
      title: String(formData.get("title") ?? "") || null,
      department: String(formData.get("department") ?? "") || null,
      status: String(formData.get("status") ?? StaffEmploymentStatus.ACTIVE) as StaffEmploymentStatus,
      actorUserId: session.user.id,
    });
    revalidateStaffFinance(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === "STAFF_PROFILE_NOT_FOUND") {
      return { error: error.message };
    }
    throw error;
  }
}

export async function recordStaffMovementAction(
  locale: string,
  propertyId: string,
  staffProfileId: string,
  _prev: StaffFinanceActionState,
  formData: FormData,
): Promise<StaffFinanceActionState> {
  const session = await adminContext();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    await getStaffFinanceService().recordMovement({
      organizationId: session.user.organizationId,
      propertyId,
      staffProfileId,
      movementType: String(formData.get("movementType") ?? StaffMovementType.SALARY_ACCRUAL) as StaffMovementType,
      categoryId: String(formData.get("categoryId") ?? ""),
      cashboxId: String(formData.get("cashboxId") ?? "") || null,
      amount: String(formData.get("amount") ?? ""),
      documentNo: String(formData.get("documentNo") ?? "") || null,
      description: String(formData.get("description") ?? "") || null,
      actorUserId: session.user.id,
    });
    revalidateStaffFinance(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      const known = [
        "AMOUNT_INVALID",
        "CATEGORY_NOT_FOUND",
        "CATEGORY_TYPE_MISMATCH",
        "CASHBOX_NOT_FOUND",
        "CASHBOX_INSUFFICIENT",
        "CASHBOX_NOT_ALLOWED",
        "PERIOD_CLOSED",
        "STAFF_PROFILE_NOT_FOUND",
        "STAFF_PROFILE_PASSIVE",
      ];
      if (known.includes(error.message)) return { error: error.message };
    }
    throw error;
  }
}
