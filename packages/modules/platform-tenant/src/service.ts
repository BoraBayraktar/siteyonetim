import bcrypt from "bcryptjs";
import { createAuditService } from "@siteyonetim/platform-audit";

import type {
  PropertyTenantServiceContract,
  ProvisionPropertyTenantInput,
  SetUnitCredentialInput,
  UpdatePortalAuthModeInput,
  UpdateTenantIsolationInput,
  UpsertPortalSettingsInput,
  ValidateUnitCredentialInput,
} from "./contract";
import { PropertyTenantRepository } from "./repository";

function slugifyPortalCode(name: string): string {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return base || "SITE";
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

export class PropertyTenantService implements PropertyTenantServiceContract {
  constructor(
    private readonly repository = new PropertyTenantRepository(),
    private readonly audit = createAuditService(),
  ) {}

  async provisionPropertyTenant(input: ProvisionPropertyTenantInput) {
    const exists = await this.repository.propertyExists(input.organizationId, input.propertyId);
    if (!exists) throw new Error("PROPERTY_NOT_FOUND");

    const existing = await this.repository.getByPropertyId(input.organizationId, input.propertyId);
    if (existing) return existing;

    let portalCode = `${slugifyPortalCode(input.propertyName)}-${randomSuffix()}`;
    let attempts = 0;
    while (await this.repository.portalCodeExists(portalCode) && attempts < 8) {
      portalCode = `${slugifyPortalCode(input.propertyName)}-${randomSuffix()}`;
      attempts += 1;
    }
    if (attempts >= 8) {
      throw new Error("PORTAL_CODE_GENERATION_FAILED");
    }

    const tenant = await this.repository.createTenant({
      propertyId: input.propertyId,
      organizationId: input.organizationId,
      portalCode,
    });

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "propertyTenant.provision",
      entityType: "PropertyTenant",
      entityId: tenant.id,
      metadata: { propertyId: input.propertyId, portalCode: tenant.portalCode },
    });

    return tenant;
  }

  async getByPropertyId(organizationId: string, propertyId: string) {
    return this.repository.getByPropertyId(organizationId, propertyId);
  }

  async getByPortalCode(portalCode: string) {
    return this.repository.getByPortalCode(portalCode);
  }

  async updateIsolation(input: UpdateTenantIsolationInput) {
    if (
      input.isolationMode === "DEDICATED_DATABASE" &&
      input.allowDedicatedIsolation !== true
    ) {
      throw new Error("DEDICATED_ISOLATION_DISABLED");
    }

    const updated = await this.repository.updateIsolation(input.organizationId, input.propertyId, {
      isolationMode: input.isolationMode,
      portalAuthMode: input.portalAuthMode,
      neonProjectId: input.neonProjectId,
      neonBranchId: input.neonBranchId,
      databaseUrlSecretKey: input.databaseUrlSecretKey,
    });
    if (!updated) throw new Error("PROPERTY_TENANT_NOT_FOUND");

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "propertyTenant.isolation.update",
      entityType: "PropertyTenant",
      entityId: updated.id,
      metadata: {
        isolationMode: input.isolationMode,
        neonProjectId: input.neonProjectId ?? null,
        neonBranchId: input.neonBranchId ?? null,
      },
    });

    return updated;
  }

  async updatePortalAuthMode(input: UpdatePortalAuthModeInput) {
    const updated = await this.repository.updatePortalAuthMode(
      input.organizationId,
      input.propertyId,
      input.portalAuthMode,
    );
    if (!updated) throw new Error("PROPERTY_TENANT_NOT_FOUND");

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "propertyTenant.portalAuth.update",
      entityType: "PropertyTenant",
      entityId: updated.id,
      metadata: { portalAuthMode: input.portalAuthMode },
    });

    return updated;
  }

  async resolveDatabaseUrl(propertyId: string): Promise<string | null> {
    const row = await this.repository.getByPropertyIdAny(propertyId);
    if (!row || row.isolationMode !== "DEDICATED_DATABASE") {
      return process.env.DATABASE_URL ?? null;
    }
    if (!row.databaseUrlSecretKey) return null;
    return process.env[row.databaseUrlSecretKey] ?? null;
  }

  async getPortalSettings(organizationId: string, propertyId: string) {
    return this.repository.getPortalSettings(organizationId, propertyId);
  }

  async upsertPortalSettings(input: UpsertPortalSettingsInput) {
    const saved = await this.repository.upsertPortalSettings(input);
    if (!saved) throw new Error("PROPERTY_TENANT_NOT_FOUND");

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "propertyTenant.portalSettings.upsert",
      entityType: "PropertyPortalSettings",
      entityId: saved.propertyTenantId,
      metadata: {
        showIncomeExpenseReport: input.showIncomeExpenseReport,
        showMemberDebtSummary: input.showMemberDebtSummary,
        allowOnlinePayment: input.allowOnlinePayment,
      },
    });

    return saved;
  }

  async setUnitCredential(input: SetUnitCredentialInput) {
    const tenant = await this.repository.getByPropertyId(input.organizationId, input.propertyId);
    if (!tenant) throw new Error("PROPERTY_TENANT_NOT_FOUND");

    const unitOk = await this.repository.unitBelongsToProperty(input.propertyId, input.unitId);
    if (!unitOk) throw new Error("UNIT_NOT_FOUND");

    const passwordHash = await bcrypt.hash(input.password, 12);
    await this.repository.setUnitCredential({
      propertyTenantId: tenant.id,
      propertyId: input.propertyId,
      unitId: input.unitId,
      passwordHash,
      active: input.active,
    });

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "propertyTenant.unitCredential.set",
      entityType: "PortalUnitCredential",
      entityId: input.unitId,
      metadata: { propertyId: input.propertyId, active: input.active },
    });
  }

  async validateUnitCredential(input: ValidateUnitCredentialInput) {
    const match = await this.repository.findUnitCredentialForLogin(
      input.portalCode,
      input.blockName,
      input.unitCode,
    );
    if (!match) return null;

    const valid = await bcrypt.compare(input.password, match.credential.passwordHash);
    if (!valid) return null;

    return this.repository.toValidatedDto(match);
  }

  async touchUnitCredentialLogin(credentialId: string) {
    await this.repository.touchUnitCredentialLogin(credentialId);
  }
}

export function createPropertyTenantService(): PropertyTenantService {
  return new PropertyTenantService();
}
