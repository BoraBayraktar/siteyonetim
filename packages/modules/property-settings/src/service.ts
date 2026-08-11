import { createAuditService } from "@siteyonetim/platform-audit";

import type {
  ApplyRecommendedDefaultsInput,
  ApplyRecommendedDefaultsResult,
  PropertyRecommendedDefaultsDto,
  PropertySettingsServiceContract,
  PropertyStaffOpsProfileDto,
  PropertyUtilityProfileDto,
  PropertyWhatsAppProfileDto,
  UpsertStaffOpsProfileInput,
  UpsertUtilityProfileInput,
  UpsertWhatsAppProfileInput,
} from "./contract";
import {
  DEFAULT_BLOCK_NAME,
  DEFAULT_CASHBOX_NAME,
  recommendCalculationMode,
  shouldSuggestDefaultBlock,
  shouldSuggestDefaultCashbox,
} from "./property-defaults";
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

  async getRecommendedDefaults(
    organizationId: string,
    propertyId: string,
  ): Promise<PropertyRecommendedDefaultsDto> {
    const meta = await this.repository.getPropertyMeta(organizationId, propertyId);
    if (!meta) throw new Error("PROPERTY_NOT_FOUND");

    return {
      propertyId,
      suggestDefaultBlock: shouldSuggestDefaultBlock(meta.kind, meta._count.blocks),
      suggestDefaultCashbox: shouldSuggestDefaultCashbox(meta._count.cashboxes),
      recommendedCalculationMode: recommendCalculationMode({
        blockCount: meta._count.blocks,
        unitCount: meta._count.units,
      }),
      defaultBlockName: DEFAULT_BLOCK_NAME,
      defaultCashboxName: DEFAULT_CASHBOX_NAME,
    };
  }

  async applyRecommendedDefaults(input: ApplyRecommendedDefaultsInput): Promise<ApplyRecommendedDefaultsResult> {
    const meta = await this.repository.getPropertyMeta(input.organizationId, input.propertyId);
    if (!meta) throw new Error("PROPERTY_NOT_FOUND");

    const recommendations = await this.getRecommendedDefaults(input.organizationId, input.propertyId);
    let createdBlock = false;
    let createdCashbox = false;

    if (recommendations.suggestDefaultBlock) {
      const { createBlockService } = await import("@siteyonetim/property-core");
      await createBlockService().create({
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        name: recommendations.defaultBlockName,
        actorUserId: input.actorUserId,
      });
      createdBlock = true;
    }

    if (recommendations.suggestDefaultCashbox) {
      const { createFinanceService } = await import("@siteyonetim/finance-core");
      await createFinanceService().createCashbox({
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        name: recommendations.defaultCashboxName,
        actorUserId: input.actorUserId,
      });
      createdCashbox = true;
    }

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "property.recommendedDefaults.apply",
      entityType: "Property",
      entityId: input.propertyId,
      metadata: { createdBlock, createdCashbox },
    });

    return { createdBlock, createdCashbox };
  }
}

export function createPropertySettingsService(): PropertySettingsService {
  return new PropertySettingsService();
}
