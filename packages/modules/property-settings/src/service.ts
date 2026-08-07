import { createAuditService } from "@siteyonetim/platform-audit";

import type {
  PropertySettingsServiceContract,
  PropertyStaffOpsProfileDto,
  PropertyUtilityProfileDto,
  PropertyWhatsAppProfileDto,
  UpsertStaffOpsProfileInput,
  UpsertUtilityProfileInput,
  UpsertWhatsAppProfileInput,
} from "./contract";
import { PropertySettingsRepository } from "./repository";

export class PropertySettingsService implements PropertySettingsServiceContract {
  constructor(
    private readonly repository = new PropertySettingsRepository(),
    private readonly audit = createAuditService(),
  ) {}

  async getUtilityProfile(organizationId: string, propertyId: string): Promise<PropertyUtilityProfileDto | null> {
    return this.repository.getUtilityProfile(organizationId, propertyId);
  }

  async upsertUtilityProfile(input: UpsertUtilityProfileInput): Promise<PropertyUtilityProfileDto> {
    const ok = await this.repository.propertyExists(input.organizationId, input.propertyId);
    if (!ok) throw new Error("PROPERTY_NOT_FOUND");

    const saved = await this.repository.upsertUtilityProfile(input);
    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "property.utilityProfile.upsert",
      entityType: "PropertyUtilityProfile",
      entityId: input.propertyId,
      metadata: {
        heatingSystem: input.heatingSystem,
        hotWaterSystem: input.hotWaterSystem,
      },
    });
    return saved;
  }

  async getWhatsAppProfile(organizationId: string, propertyId: string): Promise<PropertyWhatsAppProfileDto | null> {
    return this.repository.getWhatsAppProfile(organizationId, propertyId);
  }

  async upsertWhatsAppProfile(input: UpsertWhatsAppProfileInput): Promise<PropertyWhatsAppProfileDto> {
    const ok = await this.repository.propertyExists(input.organizationId, input.propertyId);
    if (!ok) throw new Error("PROPERTY_NOT_FOUND");
    if (!input.templateName.trim()) throw new Error("WHATSAPP_TEMPLATE_REQUIRED");

    const saved = await this.repository.upsertWhatsAppProfile({
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      enabled: input.enabled,
      phoneNumberId: input.phoneNumberId ?? null,
      templateName: input.templateName,
      templateLanguage: input.templateLanguage,
    });

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "property.whatsAppProfile.upsert",
      entityType: "PropertyWhatsAppProfile",
      entityId: input.propertyId,
      metadata: { enabled: input.enabled, templateName: saved.templateName },
    });
    return saved;
  }

  async resolveWhatsAppPhoneNumberId(organizationId: string, propertyId: string): Promise<string | null> {
    const profile = await this.repository.getWhatsAppProfile(organizationId, propertyId);
    if (profile?.enabled && profile.phoneNumberId) {
      return profile.phoneNumberId;
    }
    const envDefault = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
    if (profile?.enabled && envDefault) {
      return envDefault;
    }
    return null;
  }

  async getStaffOpsProfile(organizationId: string, propertyId: string): Promise<PropertyStaffOpsProfileDto> {
    return this.repository.getStaffOpsProfile(organizationId, propertyId);
  }

  async upsertStaffOpsProfile(input: UpsertStaffOpsProfileInput): Promise<PropertyStaffOpsProfileDto> {
    const ok = await this.repository.propertyExists(input.organizationId, input.propertyId);
    if (!ok) throw new Error("PROPERTY_NOT_FOUND");

    const saved = await this.repository.upsertStaffOpsProfile(input);
    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "property.staffOpsProfile.upsert",
      entityType: "PropertyStaffOpsProfile",
      entityId: input.propertyId,
      metadata: {
        allowAnnouncementDraft: input.allowAnnouncementDraft,
        allowDocumentUpload: input.allowDocumentUpload,
        allowIncidents: input.allowIncidents,
        staffCanViewPartyPhone: input.staffCanViewPartyPhone,
      },
    });
    return saved;
  }
}

export function createPropertySettingsService(): PropertySettingsService {
  return new PropertySettingsService();
}
