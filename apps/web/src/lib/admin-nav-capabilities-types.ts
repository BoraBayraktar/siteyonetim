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
  | "documents"
  | "incidents";

export type AdminNavCapabilities = {
  isStaffRestricted: boolean;
  showOrgSecurity: boolean;
  showOrgLegalInterest: boolean;
  showOrgUsers: boolean;
  showPropertiesList: boolean;
  propertyModules: ReadonlySet<PropertyNavModule>;
};

export function hasPropertyNavModule(
  capabilities: AdminNavCapabilities,
  module: PropertyNavModule,
): boolean {
  return capabilities.propertyModules.has(module);
}
