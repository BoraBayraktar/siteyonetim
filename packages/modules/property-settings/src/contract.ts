import type { HeatingSystemType, HotWaterSystemType } from "@siteyonetim/db";

export type PropertyUtilityProfileDto = {
  propertyId: string;
  heatingSystem: HeatingSystemType;
  hotWaterSystem: HotWaterSystemType;
  notes: string | null;
};

export type PropertyWhatsAppProfileDto = {
  propertyId: string;
  enabled: boolean;
  phoneNumberId: string | null;
  templateName: string;
  templateLanguage: string;
};

export type UpsertUtilityProfileInput = {
  organizationId: string;
  propertyId: string;
  heatingSystem: HeatingSystemType;
  hotWaterSystem: HotWaterSystemType;
  notes?: string | null;
  actorUserId?: string | null;
};

export type UpsertWhatsAppProfileInput = {
  organizationId: string;
  propertyId: string;
  enabled: boolean;
  phoneNumberId?: string | null;
  templateName: string;
  templateLanguage: string;
  actorUserId?: string | null;
};

export interface PropertySettingsServiceContract {
  getUtilityProfile(organizationId: string, propertyId: string): Promise<PropertyUtilityProfileDto | null>;
  upsertUtilityProfile(input: UpsertUtilityProfileInput): Promise<PropertyUtilityProfileDto>;
  getWhatsAppProfile(organizationId: string, propertyId: string): Promise<PropertyWhatsAppProfileDto | null>;
  upsertWhatsAppProfile(input: UpsertWhatsAppProfileInput): Promise<PropertyWhatsAppProfileDto>;
  resolveWhatsAppPhoneNumberId(organizationId: string, propertyId: string): Promise<string | null>;
}
