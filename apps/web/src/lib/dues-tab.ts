export const DUES_TABS = [
  "register",
  "accrual",
  "meters",
  "lateFee",
  "definitions",
  "expenses",
  "cashboxes",
  "accounts",
  "staffAccounts",
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

export const DUES_TAB_GROUPS = {
  collection: ["register"],
  billing: ["accrual", "lateFee"],
  ledger: ["expenses"],
  settings: ["definitions", "cashboxes", "accounts", "staffAccounts", "categories", "meters"],
} as const;

export type DuesTabGroup = keyof typeof DUES_TAB_GROUPS;

const TAB_TO_GROUP = Object.entries(DUES_TAB_GROUPS).reduce(
  (acc, [group, tabs]) => {
    for (const tab of tabs) {
      acc[tab as DuesTab] = group as DuesTabGroup;
    }
    return acc;
  },
  {} as Record<DuesTab, DuesTabGroup>,
);

export function resolveDuesTabGroup(tab: DuesTab): DuesTabGroup {
  return TAB_TO_GROUP[tab] ?? "collection";
}

export function defaultTabForGroup(group: DuesTabGroup): DuesTab {
  return DUES_TAB_GROUPS[group][0];
}

export function buildDuesTabHref(
  locale: string,
  propertyId: string,
  tab: DuesTab,
  searchParams: URLSearchParams,
): string {
  const params = new URLSearchParams(searchParams);
  params.set("tab", tab);
  return `/${locale}/admin/properties/${propertyId}/dues?${params.toString()}`;
}
