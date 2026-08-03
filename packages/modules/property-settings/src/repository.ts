import { prisma } from "@siteyonetim/db";

import type {
  PropertyReportLetterheadProfileDto,
  PropertyUtilityProfileDto,
  PropertyWhatsAppProfileDto,
  UpsertReportLetterheadProfileInput,
  UpsertUtilityProfileInput,
} from "./contract";

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

  async getReportLetterheadProfile(
    organizationId: string,
    propertyId: string,
  ): Promise<PropertyReportLetterheadProfileDto | null> {
    const row = await prisma.propertyReportLetterheadProfile.findFirst({
      where: { propertyId, organizationId, ...notDeleted },
    });
    if (!row) return null;
    return {
      propertyId: row.propertyId,
      subtitleLine: row.subtitleLine,
      legalNoticeTr: row.legalNoticeTr,
      legalNoticeEn: row.legalNoticeEn,
      documentRefPrefixTr: row.documentRefPrefixTr,
      documentRefPrefixEn: row.documentRefPrefixEn,
    };
  }

  async upsertReportLetterheadProfile(
    input: UpsertReportLetterheadProfileInput,
  ): Promise<PropertyReportLetterheadProfileDto> {
    const trimOrNull = (value?: string | null) => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : null;
    };

    const row = await prisma.propertyReportLetterheadProfile.upsert({
      where: { propertyId: input.propertyId },
      create: {
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        subtitleLine: trimOrNull(input.subtitleLine),
        legalNoticeTr: trimOrNull(input.legalNoticeTr),
        legalNoticeEn: trimOrNull(input.legalNoticeEn),
        documentRefPrefixTr: trimOrNull(input.documentRefPrefixTr),
        documentRefPrefixEn: trimOrNull(input.documentRefPrefixEn),
      },
      update: {
        subtitleLine: trimOrNull(input.subtitleLine),
        legalNoticeTr: trimOrNull(input.legalNoticeTr),
        legalNoticeEn: trimOrNull(input.legalNoticeEn),
        documentRefPrefixTr: trimOrNull(input.documentRefPrefixTr),
        documentRefPrefixEn: trimOrNull(input.documentRefPrefixEn),
        deleted: false,
        deletedDate: null,
        deletedUserId: null,
      },
    });

    return {
      propertyId: row.propertyId,
      subtitleLine: row.subtitleLine,
      legalNoticeTr: row.legalNoticeTr,
      legalNoticeEn: row.legalNoticeEn,
      documentRefPrefixTr: row.documentRefPrefixTr,
      documentRefPrefixEn: row.documentRefPrefixEn,
    };
  }
}
