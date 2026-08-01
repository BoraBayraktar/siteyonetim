import { prisma, type PortalAuthMode, type PropertyIsolationMode, type PropertyTenantStatus } from "@siteyonetim/db";

import type {
  PropertyPortalSettingsDto,
  PropertyTenantDto,
  UpsertPortalSettingsInput,
  ValidatedUnitCredentialDto,
} from "./contract";

const notDeleted = { deleted: false };

function toTenantDto(row: {
  id: string;
  propertyId: string;
  organizationId: string;
  portalCode: string;
  isolationMode: PropertyIsolationMode;
  neonProjectId: string | null;
  neonBranchId: string | null;
  databaseUrlSecretKey: string | null;
  portalAuthMode: PortalAuthMode;
  status: PropertyTenantStatus;
}): PropertyTenantDto {
  return {
    id: row.id,
    propertyId: row.propertyId,
    organizationId: row.organizationId,
    portalCode: row.portalCode,
    isolationMode: row.isolationMode,
    neonProjectId: row.neonProjectId,
    neonBranchId: row.neonBranchId,
    databaseUrlSecretKey: row.databaseUrlSecretKey,
    portalAuthMode: row.portalAuthMode,
    status: row.status,
  };
}

export class PropertyTenantRepository {
  async propertyExists(organizationId: string, propertyId: string): Promise<boolean> {
    const count = await prisma.property.count({
      where: { id: propertyId, organizationId, ...notDeleted },
    });
    return count > 0;
  }

  async portalCodeExists(portalCode: string): Promise<boolean> {
    const count = await prisma.propertyTenant.count({
      where: { portalCode: portalCode.toUpperCase(), ...notDeleted },
    });
    return count > 0;
  }

  async createTenant(data: {
    propertyId: string;
    organizationId: string;
    portalCode: string;
  }): Promise<PropertyTenantDto> {
    const tenant = await prisma.$transaction(async (tx) => {
      const created = await tx.propertyTenant.create({
        data: {
          propertyId: data.propertyId,
          organizationId: data.organizationId,
          portalCode: data.portalCode.toUpperCase(),
        },
      });
      await tx.propertyPortalSettings.create({
        data: { propertyTenantId: created.id },
      });
      return created;
    });
    return toTenantDto(tenant);
  }

  async getByPropertyId(organizationId: string, propertyId: string): Promise<PropertyTenantDto | null> {
    const row = await prisma.propertyTenant.findFirst({
      where: { propertyId, organizationId, ...notDeleted },
    });
    return row ? toTenantDto(row) : null;
  }

  async getByPropertyIdAny(propertyId: string): Promise<PropertyTenantDto | null> {
    const row = await prisma.propertyTenant.findFirst({
      where: { propertyId, ...notDeleted },
    });
    return row ? toTenantDto(row) : null;
  }

  async unitBelongsToProperty(propertyId: string, unitId: string): Promise<boolean> {
    const count = await prisma.unit.count({
      where: { id: unitId, propertyId, ...notDeleted },
    });
    return count > 0;
  }

  async getByPortalCode(portalCode: string): Promise<PropertyTenantDto | null> {
    const row = await prisma.propertyTenant.findFirst({
      where: { portalCode: portalCode.toUpperCase(), ...notDeleted, status: "ACTIVE" },
    });
    return row ? toTenantDto(row) : null;
  }

  async updateIsolation(
    organizationId: string,
    propertyId: string,
    data: {
      isolationMode: PropertyIsolationMode;
      portalAuthMode?: PortalAuthMode;
      neonProjectId?: string | null;
      neonBranchId?: string | null;
      databaseUrlSecretKey?: string | null;
    },
  ): Promise<PropertyTenantDto | null> {
    const existing = await prisma.propertyTenant.findFirst({
      where: { propertyId, organizationId, ...notDeleted },
    });
    if (!existing) return null;

    const updated = await prisma.propertyTenant.update({
      where: { id: existing.id },
      data: {
        isolationMode: data.isolationMode,
        ...(data.portalAuthMode ? { portalAuthMode: data.portalAuthMode } : {}),
        neonProjectId: data.neonProjectId ?? null,
        neonBranchId: data.neonBranchId ?? null,
        databaseUrlSecretKey: data.databaseUrlSecretKey ?? null,
      },
    });
    return toTenantDto(updated);
  }

  async updatePortalAuthMode(
    organizationId: string,
    propertyId: string,
    portalAuthMode: PortalAuthMode,
  ): Promise<PropertyTenantDto | null> {
    const existing = await prisma.propertyTenant.findFirst({
      where: { propertyId, organizationId, ...notDeleted },
    });
    if (!existing) return null;

    const updated = await prisma.propertyTenant.update({
      where: { id: existing.id },
      data: { portalAuthMode },
    });
    return toTenantDto(updated);
  }

  async getPortalSettings(organizationId: string, propertyId: string): Promise<PropertyPortalSettingsDto | null> {
    const tenant = await prisma.propertyTenant.findFirst({
      where: { propertyId, organizationId, ...notDeleted },
      include: { portalSettings: true },
    });
    if (!tenant?.portalSettings || tenant.portalSettings.deleted) return null;

    const s = tenant.portalSettings;
    return {
      propertyTenantId: tenant.id,
      propertyId: tenant.propertyId,
      showIncomeExpenseReport: s.showIncomeExpenseReport,
      showMemberDebtSummary: s.showMemberDebtSummary,
      allowOnlinePayment: s.allowOnlinePayment,
      showAnnouncements: s.showAnnouncements,
      showDocuments: s.showDocuments,
      showStatement: s.showStatement,
    };
  }

  async upsertPortalSettings(input: UpsertPortalSettingsInput): Promise<PropertyPortalSettingsDto | null> {
    const tenant = await prisma.propertyTenant.findFirst({
      where: { propertyId: input.propertyId, organizationId: input.organizationId, ...notDeleted },
    });
    if (!tenant) return null;

    const saved = await prisma.propertyPortalSettings.upsert({
      where: { propertyTenantId: tenant.id },
      create: {
        propertyTenantId: tenant.id,
        showIncomeExpenseReport: input.showIncomeExpenseReport,
        showMemberDebtSummary: input.showMemberDebtSummary,
        allowOnlinePayment: input.allowOnlinePayment,
        showAnnouncements: input.showAnnouncements,
        showDocuments: input.showDocuments,
        showStatement: input.showStatement,
      },
      update: {
        showIncomeExpenseReport: input.showIncomeExpenseReport,
        showMemberDebtSummary: input.showMemberDebtSummary,
        allowOnlinePayment: input.allowOnlinePayment,
        showAnnouncements: input.showAnnouncements,
        showDocuments: input.showDocuments,
        showStatement: input.showStatement,
        deleted: false,
        deletedDate: null,
        deletedUserId: null,
      },
    });

    return {
      propertyTenantId: tenant.id,
      propertyId: tenant.propertyId,
      showIncomeExpenseReport: saved.showIncomeExpenseReport,
      showMemberDebtSummary: saved.showMemberDebtSummary,
      allowOnlinePayment: saved.allowOnlinePayment,
      showAnnouncements: saved.showAnnouncements,
      showDocuments: saved.showDocuments,
      showStatement: saved.showStatement,
    };
  }

  async setUnitCredential(data: {
    propertyTenantId: string;
    propertyId: string;
    unitId: string;
    passwordHash: string;
    active: boolean;
  }): Promise<void> {
    await prisma.portalUnitCredential.upsert({
      where: { unitId: data.unitId },
      create: {
        propertyTenantId: data.propertyTenantId,
        propertyId: data.propertyId,
        unitId: data.unitId,
        passwordHash: data.passwordHash,
        active: data.active,
      },
      update: {
        passwordHash: data.passwordHash,
        active: data.active,
        deleted: false,
        deletedDate: null,
        deletedUserId: null,
      },
    });
  }

  async findUnitCredentialForLogin(
    portalCode: string,
    blockName: string | null | undefined,
    unitCode: string,
  ): Promise<{
    credential: { id: string; passwordHash: string; propertyId: string; unitId: string };
    organizationId: string;
    propertyName: string;
    unitCode: string;
    blockName: string | null;
  } | null> {
    const tenant = await prisma.propertyTenant.findFirst({
      where: {
        portalCode: portalCode.toUpperCase(),
        ...notDeleted,
        status: "ACTIVE",
        portalAuthMode: { in: ["UNIT_CREDENTIAL", "BOTH"] },
      },
      include: {
        property: { select: { name: true, organizationId: true } },
      },
    });
    if (!tenant) return null;

    const normalizedBlock = blockName?.trim() || null;
    const unit = await prisma.unit.findFirst({
      where: {
        propertyId: tenant.propertyId,
        code: unitCode.trim(),
        ...notDeleted,
        ...(normalizedBlock
          ? { block: { name: normalizedBlock, deleted: false } }
          : {}),
      },
      include: {
        block: { select: { name: true } },
        portalCredential: true,
      },
    });

    if (!unit?.portalCredential || unit.portalCredential.deleted || !unit.portalCredential.active) {
      return null;
    }

    return {
      credential: {
        id: unit.portalCredential.id,
        passwordHash: unit.portalCredential.passwordHash,
        propertyId: tenant.propertyId,
        unitId: unit.id,
      },
      organizationId: tenant.organizationId,
      propertyName: tenant.property.name,
      unitCode: unit.code,
      blockName: unit.block?.name ?? null,
    };
  }

  async touchUnitCredentialLogin(credentialId: string): Promise<void> {
    await prisma.portalUnitCredential.update({
      where: { id: credentialId },
      data: { lastLoginAt: new Date() },
    });
  }

  toValidatedDto(
    match: NonNullable<Awaited<ReturnType<PropertyTenantRepository["findUnitCredentialForLogin"]>>>,
  ): ValidatedUnitCredentialDto {
    const blockLabel = match.blockName ? `${match.blockName} / ` : "";
    return {
      credentialId: match.credential.id,
      organizationId: match.organizationId,
      propertyId: match.credential.propertyId,
      unitId: match.credential.unitId,
      unitCode: match.unitCode,
      blockName: match.blockName,
      propertyName: match.propertyName,
      displayName: `${match.propertyName} — ${blockLabel}${match.unitCode}`,
    };
  }
}
