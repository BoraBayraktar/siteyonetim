"use server";

import { PortalAuthMode, PropertyIsolationMode } from "@siteyonetim/db";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { assertAdminPropertyAccess, canManageOrgUsers } from "@/lib/auth-context";
import { isTenantDatabaseIsolationEnabled } from "@/lib/platform-features";
import { getPropertyTenantService } from "@/lib/services";

export type TenantActionState = {
  error?: string;
  success?: boolean;
};

async function requireSession(propertyId: string) {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    throw new Error("UNAUTHORIZED");
  }
  await assertAdminPropertyAccess(session, propertyId);
  return session;
}

export async function updatePortalSettingsAction(
  _prev: TenantActionState,
  formData: FormData,
): Promise<TenantActionState> {
  const propertyId = String(formData.get("propertyId") ?? "");
  const locale = String(formData.get("locale") ?? "tr");
  if (!propertyId) return { error: "PROPERTY_NOT_FOUND" };

  try {
    const session = await requireSession(propertyId);
    await getPropertyTenantService().upsertPortalSettings({
      organizationId: session.user.organizationId,
      propertyId,
      showIncomeExpenseReport: formData.get("showIncomeExpenseReport") === "on",
      showMemberDebtSummary: formData.get("showMemberDebtSummary") === "on",
      allowOnlinePayment: formData.get("allowOnlinePayment") === "on",
      showAnnouncements: formData.get("showAnnouncements") === "on",
      showDocuments: formData.get("showDocuments") === "on",
      showStatement: formData.get("showStatement") === "on",
      actorUserId: session.user.id,
    });

    revalidatePath(`/${locale}/admin/properties/${propertyId}/dashboard`, "page");
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === "PROPERTY_ACCESS_DENIED") {
      return { error: "PROPERTY_ACCESS_DENIED" };
    }
    throw error;
  }
}

export async function setUnitPortalPasswordAction(
  _prev: TenantActionState,
  formData: FormData,
): Promise<TenantActionState> {
  const propertyId = String(formData.get("propertyId") ?? "");
  const unitId = String(formData.get("unitId") ?? "");
  const password = String(formData.get("password") ?? "");
  const locale = String(formData.get("locale") ?? "tr");
  if (!propertyId || !unitId || !password.trim()) {
    return { error: "INVALID_INPUT" };
  }

  try {
    const session = await requireSession(propertyId);
    await getPropertyTenantService().setUnitCredential({
      organizationId: session.user.organizationId,
      propertyId,
      unitId,
      password,
      active: true,
      actorUserId: session.user.id,
    });

    revalidatePath(`/${locale}/admin/properties/${propertyId}/dashboard`, "page");
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "PROPERTY_ACCESS_DENIED") return { error: "PROPERTY_ACCESS_DENIED" };
      if (error.message === "UNIT_NOT_FOUND") return { error: "UNIT_NOT_FOUND" };
    }
    throw error;
  }
}

export async function updatePortalAuthModeAction(
  _prev: TenantActionState,
  formData: FormData,
): Promise<TenantActionState> {
  const propertyId = String(formData.get("propertyId") ?? "");
  const locale = String(formData.get("locale") ?? "tr");
  const portalAuthMode = String(formData.get("portalAuthMode") ?? PortalAuthMode.BOTH);
  if (!propertyId) return { error: "PROPERTY_NOT_FOUND" };

  try {
    const session = await requireSession(propertyId);
    await getPropertyTenantService().updatePortalAuthMode({
      organizationId: session.user.organizationId,
      propertyId,
      portalAuthMode: portalAuthMode as PortalAuthMode,
      actorUserId: session.user.id,
    });

    revalidatePath(`/${locale}/admin/properties/${propertyId}/dashboard`, "page");
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === "PROPERTY_ACCESS_DENIED") {
      return { error: "PROPERTY_ACCESS_DENIED" };
    }
    throw error;
  }
}

export async function updateTenantIsolationAction(
  _prev: TenantActionState,
  formData: FormData,
): Promise<TenantActionState> {
  const propertyId = String(formData.get("propertyId") ?? "");
  const locale = String(formData.get("locale") ?? "tr");
  const isolationMode = String(formData.get("isolationMode") ?? PropertyIsolationMode.SHARED_SCHEMA);
  if (!propertyId) return { error: "PROPERTY_NOT_FOUND" };

  try {
    const session = await requireSession(propertyId);
    if (!canManageOrgUsers(session)) {
      return { error: "UNAUTHORIZED" };
    }
    if (!isTenantDatabaseIsolationEnabled()) {
      return { error: "DEDICATED_ISOLATION_DISABLED" };
    }

    const tenantService = getPropertyTenantService();
    await tenantService.updateIsolation({
      organizationId: session.user.organizationId,
      propertyId,
      isolationMode: isolationMode as PropertyIsolationMode,
      neonProjectId: String(formData.get("neonProjectId") ?? "") || null,
      neonBranchId: String(formData.get("neonBranchId") ?? "") || null,
      databaseUrlSecretKey: String(formData.get("databaseUrlSecretKey") ?? "") || null,
      allowDedicatedIsolation: true,
      actorUserId: session.user.id,
    });

    revalidatePath(`/${locale}/admin/properties/${propertyId}/dashboard`, "page");
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "PROPERTY_ACCESS_DENIED") {
        return { error: "PROPERTY_ACCESS_DENIED" };
      }
      if (error.message === "DEDICATED_ISOLATION_DISABLED") {
        return { error: "DEDICATED_ISOLATION_DISABLED" };
      }
    }
    throw error;
  }
}
