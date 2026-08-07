import type { DuesTab } from "@/lib/dues-tab";

export const FINANCE_PANEL_TABS = ["ledger", "cashboxes", "accounts", "staffAccounts", "categories"] as const;

export type FinancePanelTab = (typeof FINANCE_PANEL_TABS)[number];

const DUES_TO_FINANCE_PANEL: Partial<Record<DuesTab, FinancePanelTab>> = {
  expenses: "ledger",
  cashboxes: "cashboxes",
  accounts: "accounts",
  staffAccounts: "staffAccounts",
  categories: "categories",
};

export function resolveFinancePanelTab(tab: DuesTab): FinancePanelTab | null {
  return DUES_TO_FINANCE_PANEL[tab] ?? null;
}

export function isFinanceDuesTab(tab: DuesTab): boolean {
  return resolveFinancePanelTab(tab) !== null;
}
