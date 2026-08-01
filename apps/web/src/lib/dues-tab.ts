export const DUES_TABS = [
  "register",
  "accrual",
  "meters",
  "lateFee",
  "definitions",
  "expenses",
  "cashboxes",
  "accounts",
  "categories",
] as const;

export type DuesTab = (typeof DUES_TABS)[number];

const LEGACY_TAB_ALIASES: Record<string, DuesTab> = {
  debt: "register",
  payment: "register",
};

export function resolveDuesTab(tab: string | null | undefined): DuesTab {
  if (tab && LEGACY_TAB_ALIASES[tab]) {
    return LEGACY_TAB_ALIASES[tab];
  }
  if (tab && DUES_TABS.includes(tab as DuesTab)) {
    return tab as DuesTab;
  }
  return "register";
}

export function shouldRedirectLegacyDuesTab(
  tab: string | null | undefined,
  section: string | null | undefined,
): string | null {
  if (tab === "debt" || tab === "payment") {
    return "register";
  }
  if (tab === "accrual" && section === "meters") {
    return "meters";
  }
  return null;
}
