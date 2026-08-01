"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { canMutateAdminData } from "@/lib/auth-context";
import { getFinanceService } from "@/lib/services";

export type BudgetActionState = { error?: string; success?: boolean };

export async function saveOperatingBudgetAction(
  locale: string,
  propertyId: string,
  _prev: BudgetActionState,
  formData: FormData,
): Promise<BudgetActionState> {
  const session = await auth();
  if (!session?.user?.organizationId || !canMutateAdminData(session)) {
    return { error: "UNAUTHORIZED" };
  }

  const year = Number(formData.get("year"));
  const notes = String(formData.get("notes") ?? "");
  const categoryIds = formData.getAll("categoryId").map(String);
  const plannedAmounts = formData.getAll("plannedAmount").map(String);

  const lines = categoryIds
    .map((categoryId, index) => ({
      categoryId,
      plannedAmount: plannedAmounts[index] ?? "0",
    }))
    .filter((line) => line.plannedAmount.trim() !== "" && Number(line.plannedAmount.replace(",", ".")) > 0);

  try {
    await getFinanceService().saveOperatingBudget({
      organizationId: session.user.organizationId,
      propertyId,
      actorUserId: session.user.id,
      year,
      notes,
      lines,
    });
    revalidatePath(`/${locale}/admin/properties/${propertyId}/reports`, "page");
    revalidatePath(`/${locale}/auditor/properties/${propertyId}/reports`, "page");
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === "PROPERTY_NOT_FOUND") {
      return { error: error.message };
    }
    throw error;
  }
}
