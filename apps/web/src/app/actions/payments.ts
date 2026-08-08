"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { isPortalSession, isUnitPortalSession } from "@/lib/auth-context";
import { getAppBaseUrl } from "@/lib/app-url";
import { getPaymentGatewayService } from "@/lib/services";

export type PaymentActionState = { error?: string; success?: boolean };

export type StartOnlinePaymentResult = { error?: string; paymentPageUrl?: string };

function revalidatePaymentAdmin(locale: string, propertyId: string) {
  revalidatePath(`/${locale}/admin/properties/${propertyId}/dashboard`, "page");
}

async function adminContext() {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    return null;
  }
  return session;
}

export async function upsertPaymentProfileAction(
  locale: string,
  propertyId: string,
  _prev: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const session = await adminContext();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    await getPaymentGatewayService().upsertProfile({
      organizationId: session.user.organizationId,
      propertyId,
      actorUserId: session.user.id,
      enabled: formData.get("enabled") === "on",
      apiKey: String(formData.get("apiKey") ?? ""),
      secretKey: String(formData.get("secretKey") ?? "") || null,
      sandbox: formData.get("sandbox") === "on",
      defaultCashboxId: String(formData.get("defaultCashboxId") ?? "") || null,
    });
    revalidatePaymentAdmin(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    throw error;
  }
}

export async function startOnlinePaymentAction(
  locale: string,
  propertyId: string,
  partyId: string,
  unitId?: string | null,
): Promise<StartOnlinePaymentResult> {
  const session = await auth();
  if (!isPortalSession(session)) return { error: "UNAUTHORIZED" };

  const gateway = getPaymentGatewayService();
  const payer = await gateway.resolvePortalPayer({
    organizationId: session.user.organizationId,
    propertyId,
    portalUserId: isUnitPortalSession(session) ? null : session.user.id,
    unitId: unitId ?? (isUnitPortalSession(session) ? session.user.unitId : null),
  });

  if (!payer || payer.partyId !== partyId) {
    return { error: "PAYER_NOT_ALLOWED" };
  }

  if (isUnitPortalSession(session)) {
    if (session.user.propertyId !== propertyId) return { error: "PAYER_NOT_ALLOWED" };
    if (unitId && session.user.unitId !== unitId) return { error: "PAYER_NOT_ALLOWED" };
  }

  try {
    const result = await gateway.startPortalCheckout({
      organizationId: session.user.organizationId,
      propertyId,
      partyId,
      unitId: unitId ?? null,
      locale,
      callbackBaseUrl: getAppBaseUrl(),
    });
    return { paymentPageUrl: result.paymentPageUrl };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    throw error;
  }
}
