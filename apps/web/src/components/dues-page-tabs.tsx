"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import {
  buildDuesTabHref,
  defaultTabForGroup,
  resolveDuesTabGroup,
  type DuesTab,
  type DuesTabGroup,
} from "@/lib/dues-tab";

type Props = {
  locale: string;
  propertyId: string;
  activeTab: DuesTab;
};

type GroupConfig = {
  id: DuesTabGroup;
  labelKey: "groupCollection" | "groupBilling" | "groupLedger" | "groupSettings";
};

const PRIMARY_GROUPS: GroupConfig[] = [
  { id: "collection", labelKey: "groupCollection" },
  { id: "billing", labelKey: "groupBilling" },
  { id: "ledger", labelKey: "groupLedger" },
  { id: "settings", labelKey: "groupSettings" },
];

type SubTabConfig = {
  tab: DuesTab;
  labelKey:
    | "subAccrual"
    | "subLateFee"
    | "subDefinitions"
    | "subCashboxes"
    | "subAccounts"
    | "subStaffAccounts"
    | "subCategories"
    | "subMeters";
};

const SUB_TABS_BY_GROUP: Record<DuesTabGroup, SubTabConfig[]> = {
  collection: [],
  billing: [
    { tab: "accrual", labelKey: "subAccrual" },
    { tab: "lateFee", labelKey: "subLateFee" },
  ],
  ledger: [],
  settings: [
    { tab: "definitions", labelKey: "subDefinitions" },
    { tab: "cashboxes", labelKey: "subCashboxes" },
    { tab: "accounts", labelKey: "subAccounts" },
    { tab: "staffAccounts", labelKey: "subStaffAccounts" },
    { tab: "categories", labelKey: "subCategories" },
    { tab: "meters", labelKey: "subMeters" },
  ],
};

function tabLinkClass(active: boolean) {
  return cn(
    "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    active
      ? "bg-background text-primary shadow-sm"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  );
}

export function DuesPageTabs({ locale, propertyId, activeTab }: Props) {
  const t = useTranslations("duesPageTabs");
  const searchParams = useSearchParams();
  const activeGroup = resolveDuesTabGroup(activeTab);
  const subTabs = SUB_TABS_BY_GROUP[activeGroup];

  return (
    <nav aria-label={t("navLabel")} className="space-y-2">
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div
          className="inline-flex h-9 min-w-0 items-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground"
          role="tablist"
        >
          {PRIMARY_GROUPS.map((group) => {
            const isActiveGroup = activeGroup === group.id;
            const href = buildDuesTabHref(
              locale,
              propertyId,
              isActiveGroup ? activeTab : defaultTabForGroup(group.id),
              new URLSearchParams(searchParams.toString()),
            );
            return (
              <Link
                key={group.id}
                href={href}
                role="tab"
                aria-selected={isActiveGroup}
                className={tabLinkClass(isActiveGroup)}
              >
                {t(group.labelKey)}
              </Link>
            );
          })}
        </div>
      </div>
      {subTabs.length > 0 ? (
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <div className="inline-flex min-w-0 flex-wrap gap-1 border-b border-border pb-2">
            {subTabs.map((sub) => {
              const isActive = activeTab === sub.tab;
              const href = buildDuesTabHref(
                locale,
                propertyId,
                sub.tab,
                new URLSearchParams(searchParams.toString()),
              );
              return (
                <Link
                  key={sub.tab}
                  href={href}
                  role="tab"
                  aria-selected={isActive}
                  className={cn(
                    "inline-flex shrink-0 rounded-none border-b-2 px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t(sub.labelKey)}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </nav>
  );
}
