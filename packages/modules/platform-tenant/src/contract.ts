import type {
  PortalAuthMode,
  PropertyIsolationMode,
  PropertyTenantStatus,
} from "@siteyonetim/db";

export type PropertyTenantDto = {
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
};

export type PropertyPortalSettingsDto = {
  propertyTenantId: string;
  propertyId: string;
  showIncomeExpenseReport: boolean;
  showMemberDebtSummary: boolean;
  allowOnlinePayment: boolean;
  showAnnouncements: boolean;
  showDocuments: boolean;
  showStatement: boolean;
};

export type ProvisionPropertyTenantInput = {
  organizationId: string;
  propertyId: string;
  propertyName: string;
  actorUserId: string;
};

export type UpdateTenantIsolationInput = {
  organizationId: string;
  propertyId: string;
  isolationMode: PropertyIsolationMode;
  portalAuthMode?: PortalAuthMode;
  neonProjectId?: string | null;
  neonBranchId?: string | null;
  databaseUrlSecretKey?: string | null;
  allowDedicatedIsolation?: boolean;
  actorUserId: string;
};

export type UpdatePortalAuthModeInput = {
  organizationId: string;
  propertyId: string;
  portalAuthMode: PortalAuthMode;
  actorUserId: string;
};

export type UpsertPortalSettingsInput = {
  organizationId: string;
  propertyId: string;
  showIncomeExpenseReport: boolean;
  showMemberDebtSummary: boolean;
  allowOnlinePayment: boolean;
  showAnnouncements: boolean;
  showDocuments: boolean;
  showStatement: boolean;
  actorUserId: string;
};

export type SetUnitCredentialInput = {
  organizationId: string;
  propertyId: string;
  unitId: string;
  password: string;
  active: boolean;
  actorUserId: string;
};

export type ValidateUnitCredentialInput = {
  portalCode: string;
  blockName?: string | null;
  unitCode: string;
  password: string;
};

export type ValidatedUnitCredentialDto = {
  credentialId: string;
  organizationId: string;
  propertyId: string;
  unitId: string;
  unitCode: string;
  blockName: string | null;
  propertyName: string;
  displayName: string;
};

export interface PropertyTenantServiceContract {
  provisionPropertyTenant(input: ProvisionPropertyTenantInput): Promise<PropertyTenantDto>;
  getByPropertyId(organizationId: string, propertyId: string): Promise<PropertyTenantDto | null>;
  getByPortalCode(portalCode: string): Promise<PropertyTenantDto | null>;
  updateIsolation(input: UpdateTenantIsolationInput): Promise<PropertyTenantDto>;
  updatePortalAuthMode(input: UpdatePortalAuthModeInput): Promise<PropertyTenantDto>;
  resolveDatabaseUrl(propertyId: string): Promise<string | null>;
  getPortalSettings(organizationId: string, propertyId: string): Promise<PropertyPortalSettingsDto | null>;
  upsertPortalSettings(input: UpsertPortalSettingsInput): Promise<PropertyPortalSettingsDto>;
  setUnitCredential(input: SetUnitCredentialInput): Promise<void>;
  validateUnitCredential(input: ValidateUnitCredentialInput): Promise<ValidatedUnitCredentialDto | null>;
  touchUnitCredentialLogin(credentialId: string): Promise<void>;
}
