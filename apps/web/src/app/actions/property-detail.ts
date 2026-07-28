"use server";

import { OccupancyRole, PartyType, PropertyKind } from "@siteyonetim/db";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  getBlockService,
  getOccupancyService,
  getPartyService,
  getPropertyService,
  getUnitService,
} from "@/lib/services";

export type ActionState = { error?: string; success?: boolean };

function revalidateProperty(locale: string, propertyId: string) {
  revalidatePath(`/${locale}/admin/properties/${propertyId}`, "page");
  revalidatePath("/tr/admin/properties", "page");
  revalidatePath("/en/admin/properties", "page");
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    return null;
  }
  return session;
}

export async function createBlockAction(
  locale: string,
  propertyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    await getBlockService().create({
      organizationId: session.user.organizationId,
      propertyId,
      name: String(formData.get("name") ?? ""),
      sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
      actorUserId: session.user.id,
    });
    revalidateProperty(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === "BLOCK_NAME_REQUIRED") {
      return { error: "BLOCK_NAME_REQUIRED" };
    }
    throw error;
  }
}

export async function createUnitAction(
  locale: string,
  propertyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) return { error: "UNAUTHORIZED" };

  const blockIdRaw = String(formData.get("blockId") ?? "");
  try {
    await getUnitService().create({
      organizationId: session.user.organizationId,
      propertyId,
      blockId: blockIdRaw || null,
      code: String(formData.get("code") ?? ""),
      floor: formData.get("floor") ? Number(formData.get("floor")) : null,
      areaM2: String(formData.get("areaM2") ?? "") || null,
      shareRatio: String(formData.get("shareRatio") ?? "") || null,
      actorUserId: session.user.id,
    });
    revalidateProperty(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNIT_CODE_REQUIRED") return { error: "UNIT_CODE_REQUIRED" };
      if (error.message === "PROPERTY_OR_BLOCK_NOT_FOUND") return { error: "PROPERTY_OR_BLOCK_NOT_FOUND" };
    }
    throw error;
  }
}

export async function createPartyAction(
  locale: string,
  propertyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) return { error: "UNAUTHORIZED" };

  const type = String(formData.get("type") ?? PartyType.PERSON) as PartyType;
  try {
    await getPartyService().create({
      organizationId: session.user.organizationId,
      type,
      displayName: String(formData.get("displayName") ?? ""),
      email: String(formData.get("email") ?? "") || null,
      phone: String(formData.get("phone") ?? "") || null,
      actorUserId: session.user.id,
    });
    revalidateProperty(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === "PARTY_NAME_REQUIRED") {
      return { error: "PARTY_NAME_REQUIRED" };
    }
    throw error;
  }
}

export async function invitePortalAction(
  locale: string,
  propertyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    await getPartyService().invitePortalAccess({
      organizationId: session.user.organizationId,
      partyId: String(formData.get("partyId") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      name: String(formData.get("name") ?? ""),
      actorUserId: session.user.id,
    });
    revalidateProperty(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      const code = error.message;
      if (
        code === "PORTAL_INVITE_INVALID" ||
        code === "PORTAL_NAME_REQUIRED" ||
        code === "PARTY_NOT_FOUND" ||
        code === "EMAIL_USED_BY_ADMIN" ||
        code === "EMAIL_USED_BY_PORTAL"
      ) {
        return { error: code };
      }
    }
    throw error;
  }
}

export async function assignOccupancyAction(
  locale: string,
  propertyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) return { error: "UNAUTHORIZED" };

  const role = String(formData.get("role") ?? OccupancyRole.OWNER) as OccupancyRole;
  try {
    await getOccupancyService().assign({
      organizationId: session.user.organizationId,
      propertyId,
      unitId: String(formData.get("unitId") ?? ""),
      partyId: String(formData.get("partyId") ?? ""),
      role,
      actorUserId: session.user.id,
    });
    revalidateProperty(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      const code = error.message;
      if (code === "OCCUPANCY_DUPLICATE" || code === "UNIT_OR_PARTY_NOT_FOUND") {
        return { error: code };
      }
    }
    throw error;
  }
}

export async function getPropertyForAdmin(organizationId: string, propertyId: string) {
  return getPropertyService().getById(organizationId, propertyId);
}

export { PropertyKind };
