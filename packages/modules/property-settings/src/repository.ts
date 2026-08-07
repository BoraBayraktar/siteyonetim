import { prisma } from "@siteyonetim/db";

import type { PropertyUtilityProfileDto, PropertyWhatsAppProfileDto, PropertyStaffOpsProfileDto, UpsertUtilityProfileInput, UpsertStaffOpsProfileInput } from "./contract";
import { DEFAULT_STAFF_OPS_PROFILE } from "./contract";

const notDeleted = { deleted: false };

export class PropertySettingsRepository {
  async getUtilityProfile(organizationId: string, propertyId: string): Promise<PropertyUtilityProfileDto | null> {
    const row = await prisma.propertyUtilityProfile.findFirst({
      where: { propertyId, organizationId, ...notDeleted },
    });
    if (!row) return null;
    return {
      propertyId: row.propertyId,
      heatingSystem: row.heatingSystem,
      hotWaterSystem: row.hotWaterSystem,
      notes: row.notes,
    };
  }

  async upsertUtilityProfile(input: UpsertUtilityProfileInput): Promise<PropertyUtilityProfileDto> {
    const row = await prisma.propertyUtilityProfile.upsert({
      where: { propertyId: input.propertyId },
      create: {
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        heatingSystem: input.heatingSystem,
        hotWaterSystem: input.hotWaterSystem,
        notes: input.notes?.trim() || null,
      },
      update: {
        heatingSystem: input.heatingSystem,
        hotWaterSystem: input.hotWaterSystem,
        notes: input.notes?.trim() || null,
        deleted: false,
        deletedDate: null,
        deletedUserId: null,
      },
    });
    return {
      propertyId: row.propertyId,
      heatingSystem: row.heatingSystem,
      hotWaterSystem: row.hotWaterSystem,
      notes: row.notes,
    };
  }

  async propertyExists(organizationId: string, propertyId: string) {
    const count = await prisma.property.count({
      where: { id: propertyId, organizationId, ...notDeleted },
    });
    return count > 0;
  }

  async getWhatsAppProfile(organizationId: string, propertyId: string): Promise<PropertyWhatsAppProfileDto | null> {
    const row = await prisma.propertyWhatsAppProfile.findFirst({
      where: { propertyId, organizationId, ...notDeleted },
    });
    if (!row) return null;
    return {
      propertyId: row.propertyId,
      enabled: row.enabled,
      phoneNumberId: row.phoneNumberId,
      templateName: row.templateName,
      templateLanguage: row.templateLanguage,
    };
  }

  async upsertWhatsAppProfile(input: {
    organizationId: string;
    propertyId: string;
    enabled: boolean;
    phoneNumberId?: string | null;
    templateName: string;
    templateLanguage: string;
  }): Promise<PropertyWhatsAppProfileDto> {
    const row = await prisma.propertyWhatsAppProfile.upsert({
      where: { propertyId: input.propertyId },
      create: {
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        enabled: input.enabled,
        phoneNumberId: input.phoneNumberId?.trim() || null,
        templateName: input.templateName.trim() || "siteyonetim_duyuru",
        templateLanguage: input.templateLanguage.trim() || "tr",
      },
      update: {
        enabled: input.enabled,
        phoneNumberId: input.phoneNumberId?.trim() || null,
        templateName: input.templateName.trim() || "siteyonetim_duyuru",
        templateLanguage: input.templateLanguage.trim() || "tr",
        deleted: false,
        deletedDate: null,
        deletedUserId: null,
      },
    });
    return {
      propertyId: row.propertyId,
      enabled: row.enabled,
      phoneNumberId: row.phoneNumberId,
      templateName: row.templateName,
      templateLanguage: row.templateLanguage,
    };
  }

  async getStaffOpsProfile(organizationId: string, propertyId: string): Promise<PropertyStaffOpsProfileDto> {
    const row = await prisma.propertyStaffOpsProfile.findFirst({
      where: { propertyId, organizationId, ...notDeleted },
    });
    if (!row) {
      return { propertyId, ...DEFAULT_STAFF_OPS_PROFILE };
    }
    return {
      propertyId: row.propertyId,
      allowAnnouncementDraft: row.allowAnnouncementDraft,
      allowDocumentUpload: row.allowDocumentUpload,
      allowIncidents: row.allowIncidents,
      staffCanViewPartyPhone: row.staffCanViewPartyPhone,
    };
  }

  async upsertStaffOpsProfile(input: UpsertStaffOpsProfileInput): Promise<PropertyStaffOpsProfileDto> {
    const row = await prisma.propertyStaffOpsProfile.upsert({
      where: { propertyId: input.propertyId },
      create: {
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        allowAnnouncementDraft: input.allowAnnouncementDraft,
        allowDocumentUpload: input.allowDocumentUpload,
        allowIncidents: input.allowIncidents,
        staffCanViewPartyPhone: input.staffCanViewPartyPhone,
      },
      update: {
        allowAnnouncementDraft: input.allowAnnouncementDraft,
        allowDocumentUpload: input.allowDocumentUpload,
        allowIncidents: input.allowIncidents,
        staffCanViewPartyPhone: input.staffCanViewPartyPhone,
        deleted: false,
        deletedDate: null,
        deletedUserId: null,
      },
    });
    return {
      propertyId: row.propertyId,
      allowAnnouncementDraft: row.allowAnnouncementDraft,
      allowDocumentUpload: row.allowDocumentUpload,
      allowIncidents: row.allowIncidents,
      staffCanViewPartyPhone: row.staffCanViewPartyPhone,
    };
  }
}
