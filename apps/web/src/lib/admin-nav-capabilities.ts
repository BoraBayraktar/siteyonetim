import type { AdminNavCapabilities, PropertyNavModule } from "@/lib/admin-nav-capabilities-types";
import { isStaffRole } from "@/lib/organization-roles";

export type { AdminNavCapabilities, PropertyNavModule } from "@/lib/admin-nav-capabilities-types";
export { hasPropertyNavModule } from "@/lib/admin-nav-capabilities-types";

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
  "incidents",
]);

const STAFF_PROPERTY_MODULES: ReadonlySet<PropertyNavModule> = new Set([
  "settingsMeters",
  "announcements",
  "documents",
  "incidents",
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
