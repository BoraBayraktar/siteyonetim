"use server";

import { OccupancyRole, PartyType } from "@siteyonetim/db";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  getBlockService,
  getOccupancyService,
  getPartyService,
  getPropertyService,
  getUnitService,
} from "@/lib/services";

export type ActionState = { error?: string; success?: boolean; info?: string };

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
    if (error instanceof Error && error.message === "BLOCK_NAME_EXISTS") {
      return { error: "BLOCK_NAME_EXISTS" };
    }
    throw error;
  }
}

export async function updateBlockAction(
  locale: string,
  propertyId: string,
  blockId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    await getBlockService().update({
      organizationId: session.user.organizationId,
      propertyId,
      blockId,
      name: String(formData.get("name") ?? ""),
      sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
      actorUserId: session.user.id,
    });
    revalidateProperty(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      const code = error.message;
      if (code === "BLOCK_NAME_REQUIRED" || code === "BLOCK_NOT_FOUND" || code === "BLOCK_NAME_EXISTS") {
        return { error: code };
      }
    }
    throw error;
  }
}

export async function deleteBlockAction(
  locale: string,
  propertyId: string,
  blockId: string,
  _prev: ActionState,
): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    await getBlockService().delete({
      organizationId: session.user.organizationId,
      propertyId,
      blockId,
      actorUserId: session.user.id,
    });
    revalidateProperty(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      const code = error.message;
      if (code === "BLOCK_NOT_FOUND" || code === "BLOCK_HAS_UNITS") {
        return { error: code };
      }
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
      if (error.message === "UNIT_CODE_EXISTS") return { error: "UNIT_CODE_EXISTS" };
    }
    throw error;
  }
}

export async function updateUnitAction(
  locale: string,
  propertyId: string,
  unitId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) return { error: "UNAUTHORIZED" };

  const blockIdRaw = String(formData.get("blockId") ?? "");
  try {
    await getUnitService().update({
      organizationId: session.user.organizationId,
      propertyId,
      unitId,
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
      const code = error.message;
      if (
        code === "UNIT_CODE_REQUIRED" ||
        code === "UNIT_NOT_FOUND" ||
        code === "UNIT_CODE_EXISTS" ||
        code === "PROPERTY_OR_BLOCK_NOT_FOUND"
      ) {
        return { error: code === "UNIT_NOT_FOUND" ? "UNIT_OR_BLOCK_NOT_FOUND" : code };
      }
    }
    throw error;
  }
}

export async function deleteUnitAction(
  locale: string,
  propertyId: string,
  unitId: string,
  _prev: ActionState,
): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    await getUnitService().delete({
      organizationId: session.user.organizationId,
      propertyId,
      unitId,
      actorUserId: session.user.id,
    });
    revalidateProperty(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === "UNIT_NOT_FOUND") {
      return { error: "UNIT_OR_BLOCK_NOT_FOUND" };
    }
    throw error;
  }
}

export async function importUnitsExcelAction(
  locale: string,
  propertyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) return { error: "UNAUTHORIZED" };

  const file = formData.get("xlsxFile");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "XLSX_EMPTY" };
  }

  const xlsxBuffer = Buffer.from(await file.arrayBuffer());
  try {
    const result = await getUnitService().bulkImportFromXlsx({
      organizationId: session.user.organizationId,
      propertyId,
      xlsxBuffer,
      actorUserId: session.user.id,
    });

    const partyService = getPartyService();
    const occupancyService = getOccupancyService();
    let occupancyApplied = 0;
    for (const assignment of result.occupancyAssignments) {
      try {
        if (assignment.ownerName) {
          const owner = await partyService.findOrCreateByDisplayName({
            organizationId: session.user.organizationId,
            type: PartyType.PERSON,
            displayName: assignment.ownerName,
            actorUserId: session.user.id,
          });
          await occupancyService.setUnitRoleOccupancy({
            organizationId: session.user.organizationId,
            propertyId,
            unitId: assignment.unitId,
            role: OccupancyRole.OWNER,
            partyId: owner.id,
            actorUserId: session.user.id,
          });
          occupancyApplied += 1;
        }
        if (assignment.tenantName) {
          const tenant = await partyService.findOrCreateByDisplayName({
            organizationId: session.user.organizationId,
            type: PartyType.PERSON,
            displayName: assignment.tenantName,
            actorUserId: session.user.id,
          });
          await occupancyService.setUnitRoleOccupancy({
            organizationId: session.user.organizationId,
            propertyId,
            unitId: assignment.unitId,
            role: OccupancyRole.TENANT,
            partyId: tenant.id,
            actorUserId: session.user.id,
          });
          occupancyApplied += 1;
        }
      } catch {
        // Row-level occupancy errors are non-fatal; unit import already succeeded.
      }
    }

    revalidateProperty(locale, propertyId);
    const info = `IMPORT_${result.created}_${result.updated}_${result.skipped}_${result.errors.length}_${result.removedMalformed}_${occupancyApplied}`;
    if (result.created === 0 && result.updated === 0 && result.errors.length > 0) {
      const sample = result.errors.slice(0, 5).join(", ");
      return { error: "XLSX_IMPORT_FAILED", info: sample };
    }
    return { success: true, info };
  } catch (error) {
    if (error instanceof Error) {
      const code = error.message;
      if (
        code === "XLSX_EMPTY" ||
        code === "XLSX_INVALID" ||
        code === "XLSX_TOO_LARGE" ||
        code === "PROPERTY_OR_BLOCK_NOT_FOUND"
      ) {
        return { error: code };
      }
    }
    return { error: "UNKNOWN" };
  }
}

export async function importPartiesExcelAction(
  locale: string,
  propertyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) return { error: "UNAUTHORIZED" };

  const property = await getPropertyService().getById(session.user.organizationId, propertyId);
  if (!property) {
    return { error: "PROPERTY_OR_BLOCK_NOT_FOUND" };
  }

  const file = formData.get("xlsxFile");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "XLSX_EMPTY" };
  }

  const xlsxBuffer = Buffer.from(await file.arrayBuffer());
  try {
    const result = await getPartyService().bulkImportFromXlsx({
      organizationId: session.user.organizationId,
      xlsxBuffer,
      actorUserId: session.user.id,
    });
    revalidateProperty(locale, propertyId);
    const info = `IMPORT_${result.created}_${result.updated}_${result.skipped}_${result.errors.length}_0`;
    if (result.created === 0 && result.updated === 0) {
      if (result.errors.length > 0) {
        const sample = result.errors.slice(0, 5).join(", ");
        return { error: "XLSX_IMPORT_FAILED", info: sample };
      }
      return { error: "XLSX_IMPORT_FAILED", info: "NO_ROWS_IMPORTED" };
    }
    return { success: true, info };
  } catch (error) {
    if (error instanceof Error) {
      const code = error.message;
      if (code === "XLSX_EMPTY" || code === "XLSX_INVALID" || code === "XLSX_TOO_LARGE") {
        return { error: code };
      }
    }
    return { error: "UNKNOWN" };
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
      communicationConsent: formData.get("communicationConsent") === "on",
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

export async function updatePartyAction(
  locale: string,
  propertyId: string,
  partyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) return { error: "UNAUTHORIZED" };

  const type = String(formData.get("type") ?? PartyType.PERSON) as PartyType;
  try {
    await getPartyService().update({
      organizationId: session.user.organizationId,
      partyId,
      type,
      displayName: String(formData.get("displayName") ?? ""),
      email: String(formData.get("email") ?? "") || null,
      phone: String(formData.get("phone") ?? "") || null,
      communicationConsent: formData.get("communicationConsent") === "on",
      actorUserId: session.user.id,
    });
    revalidateProperty(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      const code = error.message;
      if (
        code === "PARTY_NAME_REQUIRED" ||
        code === "PARTY_NOT_FOUND" ||
        code === "PARTY_EMAIL_LOCKED" ||
        code === "PARTY_EMAIL_EXISTS"
      ) {
        return { error: code };
      }
    }
    throw error;
  }
}

export async function deletePartyAction(
  locale: string,
  propertyId: string,
  partyId: string,
  _prev: ActionState,
): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    await getPartyService().delete({
      organizationId: session.user.organizationId,
      partyId,
      actorUserId: session.user.id,
    });
    revalidateProperty(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      const code = error.message;
      if (code === "PARTY_NOT_FOUND" || code === "PARTY_HAS_ACTIVE_OCCUPANCY") {
        return { error: code };
      }
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

export async function setUnitRoleOccupancyAction(
  locale: string,
  propertyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) return { error: "UNAUTHORIZED" };

  const role = String(formData.get("role") ?? OccupancyRole.OWNER) as OccupancyRole;
  const mode = String(formData.get("partyMode") ?? "existing");
  const clear = formData.get("clear") === "1";

  try {
    let partyId: string | null = null;
    if (!clear) {
      if (mode === "new") {
        const displayName = String(formData.get("displayName") ?? "").trim();
        if (!displayName) {
          return { error: "PARTY_NAME_REQUIRED" };
        }
        const party = await getPartyService().findOrCreateByDisplayName({
          organizationId: session.user.organizationId,
          type: PartyType.PERSON,
          displayName,
          email: String(formData.get("email") ?? "") || null,
          phone: String(formData.get("phone") ?? "") || null,
          communicationConsent: formData.get("communicationConsent") === "on",
          actorUserId: session.user.id,
        });
        partyId = party.id;
      } else {
        partyId = String(formData.get("partyId") ?? "");
        if (!partyId) {
          return { error: "UNIT_OR_PARTY_NOT_FOUND" };
        }
      }
    }

    await getOccupancyService().setUnitRoleOccupancy({
      organizationId: session.user.organizationId,
      propertyId,
      unitId: String(formData.get("unitId") ?? ""),
      role,
      partyId,
      actorUserId: session.user.id,
    });
    revalidateProperty(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      const code = error.message;
      if (
        code === "OCCUPANCY_DUPLICATE" ||
        code === "UNIT_OR_PARTY_NOT_FOUND" ||
        code === "PARTY_NAME_REQUIRED"
      ) {
        return { error: code };
      }
    }
    throw error;
  }
}

export async function getUnitOccupancyDetailAction(propertyId: string, unitId: string) {
  const session = await requireAdmin();
  if (!session) return null;
  return getOccupancyService().getUnitOccupancyDetail({
    organizationId: session.user.organizationId,
    propertyId,
    unitId,
  });
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

export async function updateOccupancyAction(
  locale: string,
  propertyId: string,
  occupancyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) return { error: "UNAUTHORIZED" };

  const role = String(formData.get("role") ?? OccupancyRole.OWNER) as OccupancyRole;
  try {
    await getOccupancyService().updateRole({
      organizationId: session.user.organizationId,
      propertyId,
      occupancyId,
      role,
      actorUserId: session.user.id,
    });
    revalidateProperty(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      const code = error.message;
      if (code === "OCCUPANCY_DUPLICATE" || code === "OCCUPANCY_NOT_FOUND") {
        return { error: code };
      }
    }
    throw error;
  }
}

export async function endOccupancyAction(
  locale: string,
  propertyId: string,
  occupancyId: string,
  _prev: ActionState,
): Promise<ActionState> {
  const session = await requireAdmin();
  if (!session) return { error: "UNAUTHORIZED" };

  try {
    await getOccupancyService().end({
      organizationId: session.user.organizationId,
      propertyId,
      occupancyId,
      actorUserId: session.user.id,
    });
    revalidateProperty(locale, propertyId);
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === "OCCUPANCY_NOT_FOUND") {
      return { error: "OCCUPANCY_NOT_FOUND" };
    }
    throw error;
  }
}

export async function getPropertyForAdmin(organizationId: string, propertyId: string) {
  return getPropertyService().getById(organizationId, propertyId);
}
