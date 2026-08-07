import { isStaffRole } from "@/lib/auth-context";

export type PropertyNavModule =
  | "dashboard"
  | "financeRegister"
  | "financeExpenses"
  | "financeAccrual"
  | "financeLateFee"
  | "reports"
  | "governance"
  | "structureBlocks"
  | "structureUnits"
  | "structureParties"
  | "structureUtility"
  | "settingsCashboxes"
  | "settingsAccounts"
  | "settingsStaffAccounts"
  | "settingsCategories"
  | "settingsMeters"
  | "settingsDefinitions"
  | "announcements"
  | "notifications"
  | "documents";

export type AdminNavCapabilities = {
  isStaffRestricted: boolean;
  showOrgSecurity: boolean;
  showOrgLegalInterest: boolean;
  showOrgUsers: boolean;
  showPropertiesList: boolean;
  propertyModules: ReadonlySet<PropertyNavModule>;
};

const FULL_PROPERTY_MODULES: ReadonlySet<PropertyNavModule> = new Set([
  "dashboard",
  "financeRegister",
  "financeExpenses",
  "financeAccrual",
  "financeLateFee",
  "reports",
  "governance",
  "structureBlocks",
  "structureUnits",
  "structureParties",
  "structureUtility",
  "settingsCashboxes",
  "settingsAccounts",
  "settingsStaffAccounts",
  "settingsCategories",
  "settingsMeters",
  "settingsDefinitions",
  "announcements",
  "notifications",
  "documents",
]);

const STAFF_PROPERTY_MODULES: ReadonlySet<PropertyNavModule> = new Set([
  "settingsMeters",
  "announcements",
  "documents",
]);

export function resolveAdminNavCapabilities(
  role: string | null | undefined,
  canManageUsers: boolean,
): AdminNavCapabilities {
  if (isStaffRole(role)) {
    return {
      isStaffRestricted: true,
      showOrgSecurity: false,
      showOrgLegalInterest: false,
      showOrgUsers: false,
      showPropertiesList: true,
      propertyModules: STAFF_PROPERTY_MODULES,
    };
  }

  return {
    isStaffRestricted: false,
    showOrgSecurity: true,
    showOrgLegalInterest: true,
    showOrgUsers: canManageUsers,
    showPropertiesList: true,
    propertyModules: FULL_PROPERTY_MODULES,
  };
}

export function hasPropertyNavModule(
  capabilities: AdminNavCapabilities,
  module: PropertyNavModule,
): boolean {
  return capabilities.propertyModules.has(module);
}
