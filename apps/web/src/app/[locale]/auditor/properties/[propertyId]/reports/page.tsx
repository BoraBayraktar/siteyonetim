import Link from "next/link";
import type { StandardReportKind } from "@siteyonetim/reporting-standard";
import { parseReportQuarter, reportQuarterToMonthRange } from "@siteyonetim/reporting-standard";
import { isAnnualReportKind } from "@/lib/report-kinds";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { OperatingBudgetPanel } from "@/components/operating-budget-panel";
import { AuditorMyAssignmentsPanel } from "@/components/auditor-my-assignments-panel";
import { HelpButton } from "@/components/help-button";
import { ReportsPanel } from "@/components/reports-panel";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { auditorPortalPath, assertAdminPropertyAccess, isAuditorRole } from "@/lib/auth-context";
import { getBlockService, getAuditorReportService, getDuesService, getFinanceService, getPropertyService, getReportingService } from "@/lib/services";
import { mergePeriods, periodsFromAccrualRuns } from "@/lib/period-options";

const KINDS: StandardReportKind[] = [
  "ANNUAL_INCOME_EXPENSE",
  "AUDITOR_REPORT_TEMPLATE",
  "AUDIT_PACKAGE",
  "DUE_COLLECTION",
  "EXPENSE_BREAKDOWN",
  "CASHBOX_SUMMARY",
  "DEBT_AGING",
];

type Props = {
  params: Promise<{ locale: string; propertyId: string }>;
  searchParams: Promise<{
    report?: string;
    year?: string;
    month?: string;
    quarter?: string;
    blockId?: string;
    unitCode?: string;
  }>;
};

export default async function AuditorPropertyReportsPage({ params, searchParams }: Props) {
  const { locale, propertyId } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    redirect(`/${locale}/auditor/login`);
  }
  if (!isAuditorRole(session.user.role)) {
    redirect(`/${locale}/login`);
  }

  const organizationId = session.user.organizationId;
  const property = await getPropertyService().getById(organizationId, propertyId);
  if (!property) notFound();

  try {
    await assertAdminPropertyAccess(session, propertyId);
  } catch {
    notFound();
  }

  const now = new Date();
  const year = Number(sp.year ?? now.getFullYear());
  const month = Number(sp.month ?? now.getMonth() + 1);
  const blockId = sp.blockId ?? null;
  const unitCode = sp.unitCode?.trim() || null;
  const quarter = parseReportQuarter(sp.quarter);
  const quarterMonths = reportQuarterToMonthRange(quarter);
  const activeKind = KINDS.includes(sp.report as StandardReportKind)
    ? (sp.report as StandardReportKind)
    : "ANNUAL_INCOME_EXPENSE";

  const filter = {
    organizationId,
    propertyId,
    year,
    month: isAnnualReportKind(activeKind) ? 1 : month,
    blockId,
    unitCode,
    actorUserId: session.user.id,
    locale,
    ...quarterMonths,
  };

  const reporting = getReportingService();
  const finance = getFinanceService();
  const ctx = { organizationId, propertyId, actorUserId: session.user.id };
  const accrualRuns = await getDuesService().listAccrualRuns(ctx);
  const reportPeriods = mergePeriods(periodsFromAccrualRuns(accrualRuns, true), [{ year, month }]);
  const blocksPage = await getBlockService().list({ organizationId, propertyId, page: 1, pageSize: 200 });
  const recentExports = await reporting.listReportExports(organizationId, propertyId, 8);
  const categories = await finance.listCategories({ organizationId, propertyId });
  const budget = await finance.getOperatingBudget({ organizationId, propertyId }, year);

  const annual =
    activeKind === "ANNUAL_INCOME_EXPENSE" || activeKind === "AUDITOR_REPORT_TEMPLATE"
      ? await reporting.annualIncomeExpense({ ...filter, month: 1 })
      : null;

  const [collection, expense, cashbox, aging, myAssignmentsPage] = await Promise.all([
    activeKind === "DUE_COLLECTION" ? reporting.dueCollection(filter) : null,
    activeKind === "EXPENSE_BREAKDOWN" ? reporting.expenseBreakdown(filter) : null,
    activeKind === "CASHBOX_SUMMARY" ? reporting.cashboxSummary(filter) : null,
    activeKind === "DEBT_AGING" ? reporting.debtAging(filter) : null,
    getAuditorReportService().listAssignments({
      organizationId,
      propertyId,
      year,
      page: 1,
      pageSize: 50,
      auditorUserId: session.user.id,
    }),
  ]);

  const t = await getTranslations("reports");
  const tCommon = await getTranslations("common");

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 px-0">
            <Link href={auditorPortalPath(locale)}>← {tCommon("back")}</Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {property.name} — {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <HelpButton topicKey="reports" />
      </div>

      <OperatingBudgetPanel
        locale={locale}
        propertyId={propertyId}
        year={year}
        categories={categories}
        budget={budget}
        readOnly
      />

      <AuditorMyAssignmentsPanel
        locale={locale}
        propertyId={propertyId}
        assignments={myAssignmentsPage.items}
      />

      <Suspense fallback={<p className="text-sm text-muted-foreground">…</p>}>
        <ReportsPanel
          locale={locale}
          propertyId={propertyId}
          year={year}
          month={month}
          quarter={quarter}
          blockId={blockId}
          unitCode={unitCode}
          activeKind={activeKind}
          blocks={blocksPage.items}
          accrual={null}
          collection={collection}
          expense={expense}
          cashbox={cashbox}
          aging={aging}
          annual={annual}
          recentExports={recentExports}
          periods={reportPeriods}
          readOnly
          reportKinds={KINDS}
        />
      </Suspense>
    </main>
  );
}
