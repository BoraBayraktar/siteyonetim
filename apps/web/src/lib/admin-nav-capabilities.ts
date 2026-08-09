import { OrganizationRole } from "@siteyonetim/db";

import type { AdminNavCapabilities, AdminNavProfile, PropertyNavModule } from "@/lib/admin-nav-capabilities-types";
import { adminNavProfileFromDb } from "@/lib/admin-nav-capabilities-types";
import { isStaffRole } from "@/lib/organization-roles";

export type { AdminNavCapabilities, AdminNavProfile, PropertyNavModule, PropertyUiMode } from "@/lib/admin-nav-capabilities-types";
export {
  adminNavProfileToDb,
  hasPropertyNavModule,
  propertyUiModeFromDb,
  propertyUiModeToDb,
} from "@/lib/admin-nav-capabilities-types";

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
  "helpGlossary",
]);

const DAILY_PROPERTY_MODULES: ReadonlySet<PropertyNavModule> = new Set([
  "dashboard",
  "financeRegister",
  "financeExpenses",
  "financeAccrual",
  "financeLateFee",
  "announcements",
  "documents",
  "incidents",
  "helpGlossary",
]);

const READONLY_PROPERTY_MODULES: ReadonlySet<PropertyNavModule> = new Set([
  "dashboard",
  "financeRegister",
  "financeExpenses",
  "reports",
  "governance",
  "announcements",
  "documents",
  "incidents",
  "helpGlossary",
]);

const STAFF_PROPERTY_MODULES: ReadonlySet<PropertyNavModule> = new Set([
  "settingsMeters",
  "announcements",
  "documents",
  "incidents",
]);

export const SIMPLE_PROPERTY_MODULES: ReadonlySet<PropertyNavModule> = new Set([
  "dashboard",
  "financeRegister",
  "financeAccrual",
  "financeExpenses",
  "announcements",
  "propertySetup",
  "helpGlossary",
]);

export function resolveDefaultNavProfile(role: string | null | undefined): AdminNavProfile {
  if (role === OrganizationRole.ACCOUNTANT || role === OrganizationRole.ORG_ADMIN) {
    return "full";
  }
  if (role === OrganizationRole.BOARD_MEMBER) {
    return "readonly";
  }
  return "daily";
}

function modulesForProfile(profile: AdminNavProfile): ReadonlySet<PropertyNavModule> {
  switch (profile) {
    case "daily":
      return DAILY_PROPERTY_MODULES;
    case "readonly":
      return READONLY_PROPERTY_MODULES;
    default:
      return FULL_PROPERTY_MODULES;
  }
}

export function resolveEffectiveNavProfile(
  role: string | null | undefined,
  navProfileOverride: AdminNavProfile | null | undefined,
): AdminNavProfile {
  if (role === OrganizationRole.ACCOUNTANT || role === OrganizationRole.ORG_ADMIN) {
    return "full";
  }
  if (role === OrganizationRole.BOARD_MEMBER) {
    return "readonly";
  }
  return navProfileOverride ?? resolveDefaultNavProfile(role);
}

export function canToggleNavProfile(role: string | null | undefined): boolean {
  return role === OrganizationRole.PROPERTY_MANAGER;
}

export function canOverrideSimpleUiMode(role: string | null | undefined): boolean {
  return role === OrganizationRole.ACCOUNTANT || role === OrganizationRole.ORG_ADMIN;
}

export function resolvePropertyNavModules(
  capabilities: AdminNavCapabilities,
  options: {
    propertyUiMode: import("@/lib/admin-nav-capabilities-types").PropertyUiMode;
    role: string | null | undefined;
  },
): ReadonlySet<PropertyNavModule> {
  if (
    options.propertyUiMode === "simple" &&
    !canOverrideSimpleUiMode(options.role)
  ) {
    return SIMPLE_PROPERTY_MODULES;
  }
  return capabilities.propertyModules;
}

export function resolveAdminNavCapabilities(
  role: string | null | undefined,
  canManageUsers: boolean,
  navProfileOverride?: import("@siteyonetim/db").AdminNavProfile | null,
): AdminNavCapabilities {
  if (isStaffRole(role)) {
    return {
      isStaffRestricted: true,
      showOrgSecurity: false,
      showOrgLegalInterest: false,
      showOrgUsers: false,
      showPropertiesList: true,
      navProfile: "daily",
      canToggleNavProfile: false,
      propertyModules: STAFF_PROPERTY_MODULES,
    };
  }

  const effectiveProfile = resolveEffectiveNavProfile(role, adminNavProfileFromDb(navProfileOverride));

  return {
    isStaffRestricted: false,
    showOrgSecurity: true,
    showOrgLegalInterest: true,
    showOrgUsers: canManageUsers,
    showPropertiesList: true,
    navProfile: effectiveProfile,
    canToggleNavProfile: canToggleNavProfile(role),
    propertyModules: modulesForProfile(effectiveProfile),
  };
}
