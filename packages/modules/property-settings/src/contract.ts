import type { AdminUiMode, DueCalculationMode, HeatingSystemType, HotWaterSystemType } from "@siteyonetim/db";

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

export type PropertyStaffOpsProfileDto = {
  propertyId: string;
  allowAnnouncementDraft: boolean;
  allowDocumentUpload: boolean;
  allowIncidents: boolean;
  staffCanViewPartyPhone: boolean;
};

export const DEFAULT_STAFF_OPS_PROFILE: Omit<PropertyStaffOpsProfileDto, "propertyId"> = {
  allowAnnouncementDraft: true,
  allowDocumentUpload: true,
  allowIncidents: true,
  staffCanViewPartyPhone: false,
};

export type UpsertStaffOpsProfileInput = {
  organizationId: string;
  propertyId: string;
  allowAnnouncementDraft: boolean;
  allowDocumentUpload: boolean;
  allowIncidents: boolean;
  staffCanViewPartyPhone: boolean;
  actorUserId?: string | null;
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

export type PropertyUiModeDto = {
  propertyId: string;
  adminUiMode: AdminUiMode;
};

export type SetUiModeInput = {
  organizationId: string;
  propertyId: string;
  adminUiMode: AdminUiMode;
  actorUserId?: string | null;
};

export type PropertyRecommendedDefaultsDto = {
  propertyId: string;
  suggestSimpleMode: boolean;
  suggestDefaultBlock: boolean;
  suggestDefaultCashbox: boolean;
  recommendedCalculationMode: DueCalculationMode;
  defaultBlockName: string;
  defaultCashboxName: string;
};

export type ApplyRecommendedDefaultsInput = {
  organizationId: string;
  propertyId: string;
  applySimpleMode?: boolean;
  actorUserId?: string | null;
};

export type ApplyRecommendedDefaultsResult = {
  createdBlock: boolean;
  createdCashbox: boolean;
  appliedSimpleMode: boolean;
};

export interface PropertySettingsServiceContract {
  getUtilityProfile(organizationId: string, propertyId: string): Promise<PropertyUtilityProfileDto | null>;
  upsertUtilityProfile(input: UpsertUtilityProfileInput): Promise<PropertyUtilityProfileDto>;
  getWhatsAppProfile(organizationId: string, propertyId: string): Promise<PropertyWhatsAppProfileDto | null>;
  upsertWhatsAppProfile(input: UpsertWhatsAppProfileInput): Promise<PropertyWhatsAppProfileDto>;
  resolveWhatsAppPhoneNumberId(organizationId: string, propertyId: string): Promise<string | null>;
  getStaffOpsProfile(organizationId: string, propertyId: string): Promise<PropertyStaffOpsProfileDto>;
  upsertStaffOpsProfile(input: UpsertStaffOpsProfileInput): Promise<PropertyStaffOpsProfileDto>;
  getUiMode(organizationId: string, propertyId: string): Promise<PropertyUiModeDto>;
  setUiMode(input: SetUiModeInput): Promise<PropertyUiModeDto>;
  getRecommendedDefaults(organizationId: string, propertyId: string): Promise<PropertyRecommendedDefaultsDto>;
  applyRecommendedDefaults(input: ApplyRecommendedDefaultsInput): Promise<ApplyRecommendedDefaultsResult>;
}
