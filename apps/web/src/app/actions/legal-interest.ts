"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { getDuesService } from "@/lib/services";

export type LegalInterestActionState = { error?: string; success?: boolean };

async function adminContext() {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    return null;
  }
  return session;
}

export async function upsertLegalInterestRateAction(
  locale: string,
  _prev: LegalInterestActionState,
  formData: FormData,
): Promise<LegalInterestActionState> {
  const session = await adminContext();
  if (!session) return { error: "UNAUTHORIZED" };
  try {
    await getDuesService().upsertLegalInterestRate({
      organizationId: session.user.organizationId,
      year: Number(formData.get("year")),
      month: Number(formData.get("month")),
      annualRatePercent: String(formData.get("annualRatePercent") ?? ""),
      notes: String(formData.get("notes") ?? "") || null,
      actorUserId: session.user.id,
    });
    revalidatePath(`/${locale}/admin/legal-interest`, "page");
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === "LEGAL_RATE_INVALID") {
      return { error: error.message };
    }
    throw error;
  }
}
