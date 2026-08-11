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

export type AdminNavProfile = "daily" | "full" | "readonly";

export type AdminNavCapabilities = {
  isStaffRestricted: boolean;
  showOrgSecurity: boolean;
  showOrgLegalInterest: boolean;
  showOrgUsers: boolean;
  showPropertiesList: boolean;
  navProfile: AdminNavProfile;
  canToggleNavProfile: boolean;
  propertyModules: ReadonlySet<PropertyNavModule>;
};

export function hasPropertyNavModule(
  capabilities: AdminNavCapabilities,
  module: PropertyNavModule,
): boolean {
  return capabilities.propertyModules.has(module);
}

export function adminNavProfileFromDb(
  profile: import("@siteyonetim/db").AdminNavProfile | null | undefined,
): AdminNavProfile | null {
  if (!profile) return null;
  switch (profile) {
    case "DAILY":
      return "daily";
    case "FULL":
      return "full";
    case "READONLY":
      return "readonly";
    default:
      return null;
  }
}

export function adminNavProfileToDb(profile: AdminNavProfile): import("@siteyonetim/db").AdminNavProfile {
  switch (profile) {
    case "daily":
      return "DAILY";
    case "full":
      return "FULL";
    case "readonly":
      return "READONLY";
  }
}
