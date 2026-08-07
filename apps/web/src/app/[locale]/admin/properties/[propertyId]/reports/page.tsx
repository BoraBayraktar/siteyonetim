import Link from "next/link";
import type { StandardReportKind } from "@siteyonetim/reporting-standard";
import { parseReportQuarter, reportQuarterToMonthRange } from "@siteyonetim/reporting-standard";
import { isAnnualReportKind } from "@/lib/report-kinds";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { BankReconciliationPanel } from "@/components/bank-reconciliation-panel";
import { BankWebhookSettingsPanel } from "@/components/bank-webhook-settings-panel";
import { OperatingBudgetPanel } from "@/components/operating-budget-panel";
import { AuditorAssignmentPanel } from "@/components/auditor-assignment-panel";
import { ReportsPanel } from "@/components/reports-panel";
import { getAdminSession } from "@/lib/cached-admin";
import { canManageAuditorAssignments, isAuditorRole } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  getAuditorReportService,
  getBankingService,
  getBlockService,
  getFinanceService,
  getPropertyRbacService,
  getPropertyService,
  getReportingService,
  getStaffFinanceService,
} from "@/lib/services";
import { getAppBaseUrl } from "@/lib/app-url";
import { OrganizationRole } from "@siteyonetim/db";

const KINDS: StandardReportKind[] = [
  "DUE_ACCRUAL_SUMMARY",
  "DUE_COLLECTION",
  "EXPENSE_BREAKDOWN",
  "CASHBOX_SUMMARY",
  "DEBT_AGING",
  "BANK_RECONCILIATION",
  "ANNUAL_INCOME_EXPENSE",
  "AUDITOR_REPORT_TEMPLATE",
  "AUDIT_PACKAGE",
];

type Props = {
  params: Promise<{ locale: string; propertyId: string }>;
  searchParams: Promise<{ report?: string; year?: string; month?: string; quarter?: string; blockId?: string; page?: string }>;
};

export default async function PropertyReportsPage({ params, searchParams }: Props) {
  const { locale, propertyId } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  const session = await getAdminSession();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    redirect(`/${locale}/login`);
  }
  if (isAuditorRole(session.user.role)) {
    redirect(`/${locale}/auditor/properties/${propertyId}/reports?${new URLSearchParams(sp as Record<string, string>).toString()}`);
  }

  const organizationId = session.user.organizationId;
  const property = await getPropertyService().getById(organizationId, propertyId);
  if (!property) notFound();

  const now = new Date();
  const year = Number(sp.year ?? now.getFullYear());
  const month = Number(sp.month ?? now.getMonth() + 1);
  const blockId = sp.blockId ?? null;
  const quarter = parseReportQuarter(sp.quarter);
  const quarterMonths = reportQuarterToMonthRange(quarter);
  const activeKind = KINDS.includes(sp.report as StandardReportKind)
    ? (sp.report as StandardReportKind)
    : "DUE_ACCRUAL_SUMMARY";

  const filter = {
    organizationId,
    propertyId,
    year,
    month: isAnnualReportKind(activeKind) ? 1 : month,
    blockId,
    actorUserId: session.user.id,
    locale,
    ...quarterMonths,
  };

  const reporting = getReportingService();
  const finance = getFinanceService();
  const blocksPage = await getBlockService().list({ organizationId, propertyId, page: 1, pageSize: 200 });
  const recentExports = await reporting.listReportExports(organizationId, propertyId, 8);
  const categories = await finance.listCategories({ organizationId, propertyId });
  const budget = await finance.getOperatingBudget({ organizationId, propertyId }, year);

  const annual =
    activeKind === "ANNUAL_INCOME_EXPENSE" || activeKind === "AUDITOR_REPORT_TEMPLATE"
      ? await reporting.annualIncomeExpense({ ...filter, month: 1 })
      : null;

  const [accrual, collection, expense, cashbox, aging] = await Promise.all([
    activeKind === "DUE_ACCRUAL_SUMMARY" ? reporting.dueAccrualSummary(filter) : null,
    activeKind === "DUE_COLLECTION" ? reporting.dueCollection(filter) : null,
    activeKind === "EXPENSE_BREAKDOWN" ? reporting.expenseBreakdown(filter) : null,
    activeKind === "CASHBOX_SUMMARY" ? reporting.cashboxSummary(filter) : null,
    activeKind === "DEBT_AGING" ? reporting.debtAging(filter) : null,
  ]);

  const assignmentPage = Math.max(1, Number(sp.page ?? 1));
  const assignmentPageSize = 10;
  const showAuditorAssignments = activeKind === "AUDITOR_REPORT_TEMPLATE";
  const canManageAssignments = canManageAuditorAssignments(session);

  const [assignmentsPage, orgUsers] = showAuditorAssignments
    ? await Promise.all([
        getAuditorReportService().listAssignments({
          organizationId,
          propertyId,
          year,
          page: assignmentPage,
          pageSize: assignmentPageSize,
        }),
        canManageAssignments
          ? getPropertyRbacService().listOrgUsers({ organizationId })
          : Promise.resolve([]),
      ])
    : [null, []];

  const auditors = orgUsers.filter((user) => user.organizationRole === OrganizationRole.AUDITOR);

  const bankingCtx = { organizationId, propertyId, actorUserId: session.user.id };
  const showBankReconciliation = activeKind === "BANK_RECONCILIATION";
  const [cashboxes, bankImports, unmatchedPage, bankReconciliation, bankWebhookProfile, staffProfilesPage] =
    showBankReconciliation
    ? await Promise.all([
        finance.listCashboxes(bankingCtx),
        getBankingService().listImports(bankingCtx, year, month),
        getBankingService().listUnmatchedLines({
          ...bankingCtx,
          year,
          month,
          page: 1,
          pageSize: 20,
        }),
        reporting.bankReconciliation(filter),
        getBankingService().getWebhookProfile(bankingCtx),
        getStaffFinanceService().listStaffProfiles({
          ...bankingCtx,
          page: 1,
          pageSize: 200,
          status: "ACTIVE",
        }),
      ])
    : [[], [], { items: [], total: 0, page: 1, pageSize: 20 }, null, null, { items: [], total: 0, page: 1, pageSize: 200 }];

  const t = await getTranslations("reports");
  const tCommon = await getTranslations("common");

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 px-0">
          <Link href={`/${locale}/admin/properties/${propertyId}/dashboard`}>← {tCommon("back")}</Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          {property.name} — {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <OperatingBudgetPanel
        locale={locale}
        propertyId={propertyId}
        year={year}
        categories={categories}
        budget={budget}
      />

      <Suspense fallback={<p className="text-sm text-muted-foreground">…</p>}>
        <ReportsPanel
          locale={locale}
          propertyId={propertyId}
          year={year}
          month={month}
          quarter={quarter}
          blockId={blockId}
          activeKind={activeKind}
          blocks={blocksPage.items}
          accrual={accrual}
          collection={collection}
          expense={expense}
          cashbox={cashbox}
          aging={aging}
          annual={annual}
          recentExports={recentExports}
        />
      </Suspense>

      {showBankReconciliation && bankReconciliation ? (
        <>
          <BankWebhookSettingsPanel
            locale={locale}
            propertyId={propertyId}
            cashboxes={cashboxes}
            profile={bankWebhookProfile}
            webhookEndpoint={`${getAppBaseUrl()}/api/banking/webhook/${propertyId}`}
          />
          <BankReconciliationPanel
            locale={locale}
            propertyId={propertyId}
            year={year}
            month={month}
            cashboxes={cashboxes}
            imports={bankImports}
            unmatchedLines={unmatchedPage.items}
            unmatchedTotal={unmatchedPage.total}
            bankReconciliation={bankReconciliation}
            categories={categories}
            staffProfiles={staffProfilesPage.items}
          />
        </>
      ) : null}

      {showAuditorAssignments && assignmentsPage ? (
        <AuditorAssignmentPanel
          locale={locale}
          propertyId={propertyId}
          year={year}
          assignments={assignmentsPage.items}
          page={assignmentsPage.page}
          pageSize={assignmentsPage.pageSize}
          total={assignmentsPage.total}
          auditors={auditors}
          canManage={canManageAssignments}
        />
      ) : null}
    </div>
  );
}
