"use client";

import { LedgerEntryType } from "@siteyonetim/db";
import type { LedgerEntryDto } from "@siteyonetim/finance-core";
import type { AccrualContextWarningsDto } from "@siteyonetim/finance-dues";
import type { PropertySetupStatusDto, PropertyDashboardDto } from "@siteyonetim/reporting-standard";
import type { StaffFinanceSummaryDto } from "@siteyonetim/property-staff-finance";
import { AlertTriangle, ArrowRight, Building2, Coins, Receipt, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { DebtStatusTable } from "@/components/debt-status-table";
import { PropertySetupChecklist } from "@/components/property-setup-checklist";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  locale: string;
  propertyId: string;
  dashboard: PropertyDashboardDto;
  setup: PropertySetupStatusDto;
  recentLedger: LedgerEntryDto[];
  staffSummary: StaffFinanceSummaryDto;
};

function money(value: string, locale: string) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: "TRY",
  }).format(Number(value));
}

function formatPeriodMonth(month: number, locale: string) {
  const date = new Date(2000, month - 1, 1);
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", { month: "long" }).format(date);
}

function formatEntryDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function PropertyDashboardPanel({
  locale,
  propertyId,
  dashboard,
  setup,
  recentLedger,
  staffSummary,
}: Props) {
  const t = useTranslations("dashboard");
  const tFinance = useTranslations("finance");
  const router = useRouter();
  const base = `/${locale}/admin/properties/${propertyId}`;
  const periodLabel = `${formatPeriodMonth(dashboard.month, locale)} ${dashboard.year}`;

  const kpiCards = [
    {
      key: "totalDebt",
      label: t("kpiTotalDebt"),
      value: money(dashboard.totalDebt, locale),
      icon: AlertTriangle,
      hint: t("kpiTotalDebtHint"),
    },
    {
      key: "monthlyAccrued",
      label: t("kpiMonthlyAccrued", { period: periodLabel }),
      value: money(dashboard.monthlyAccrued, locale),
      icon: Coins,
      hint: t("kpiMonthlyAccruedHint"),
    },
    {
      key: "cashboxBalance",
      label: t("kpiCashbox"),
      value: money(dashboard.cashboxBalance, locale),
      icon: Wallet,
      hint: t("kpiCashboxHint"),
    },
    {
      key: "overdueUnits",
      label: t("kpiOverdueUnits"),
      value: String(dashboard.overdueUnitCount),
      icon: Building2,
      hint: t("kpiOverdueUnitsHint"),
    },
    {
      key: "staffPayable",
      label: t("kpiStaffPayable"),
      value: money(staffSummary.totalPayable, locale),
      icon: Users,
      hint: t("kpiStaffPayableHint", { count: staffSummary.activeCount }),
      href: `${base}/dues?tab=staffAccounts`,
    },
  ] as const;

  return (
    <div className="space-y-6">
      <PropertySetupChecklist locale={locale} propertyId={propertyId} setup={setup} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpiCards.map((card) => {
          const content = (
            <>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
                <card.icon className="size-4 text-muted-foreground" aria-hidden />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tracking-tight">{card.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
              </CardContent>
            </>
          );

          if ("href" in card && card.href) {
            return (
              <Link key={card.key} href={card.href} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Card className="h-full transition-colors hover:bg-muted/30">{content}</Card>
              </Link>
            );
          }

          return <Card key={card.key}>{content}</Card>;
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("quickActions")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`${base}/dues?tab=register`}>{t("recordPayment")}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`${base}/dues?tab=accrual`}>{t("generateAccrual")}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`${base}/dues?tab=expenses`}>{t("recordExpense")}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`${base}/dues?tab=staffAccounts`}>{t("manageStaffAccounts")}</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href={`${base}/reports`}>
              {t("viewReports")}
              <ArrowRight className="ml-1 size-4" aria-hidden />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <DebtStatusTable
          locale={locale}
          propertyId={propertyId}
          rows={dashboard.topDebtors.map((row) => ({
            unitCode: row.unitCode,
            blockName: row.blockName,
            partyName: row.partyName,
            totalDebt: row.totalDebt,
            aging61Plus: row.aging61Plus,
          }))}
          blocks={[]}
          filters={{ q: "", blockId: "all", overdueOnly: false }}
          onSearchChange={() => undefined}
          onBlockChange={() => undefined}
          onOverdueToggle={() => undefined}
          onRowClick={(row) => {
            router.push(`${base}/dues?tab=register&q=${encodeURIComponent(row.unitCode)}`);
          }}
          compact
          title={t("topDebtors")}
          showToolbar={false}
          footerLink={{ href: `${base}/dues?tab=register`, label: t("viewAllDebt") }}
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">{t("recentActivity")}</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`${base}/dues?tab=expenses`}>{t("viewAllActivity")}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentLedger.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noActivity")}</p>
            ) : (
              <ul className="space-y-3">
                {recentLedger.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-start justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Receipt className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                        <p className="truncate text-sm font-medium">
                          {entry.entryType === LedgerEntryType.INCOME
                            ? tFinance("income")
                            : tFinance("expense")}
                          {" · "}
                          {entry.categoryName}
                        </p>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {formatEntryDate(entry.entryDate, locale)}
                        {entry.description ? ` · ${entry.description}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium">{money(entry.amount, locale)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
