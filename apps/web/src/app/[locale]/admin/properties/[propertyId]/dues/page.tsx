import Link from "next/link";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { DuesTabs } from "@/components/dues-tabs";
import { DuesPageTabs } from "@/components/dues-page-tabs";
import { HelpButton } from "@/components/help-button";
import { SimpleDuesHub } from "@/components/simple-dues-hub";
import { Button } from "@/components/ui/button";
import { getAdminSession } from "@/lib/cached-admin";
import { requireAdminPropertyScope } from "@/lib/admin-property-scope";
import { canOverrideSimpleUiMode } from "@/lib/admin-nav-capabilities";
import { propertyUiModeFromDb } from "@/lib/admin-nav-capabilities-types";
import { isStaffRole } from "@/lib/auth-context";
import { resolveDuesTab, shouldRedirectLegacyDuesTab, type DuesTab } from "@/lib/dues-tab";
import { parseAccrualFilters } from "@/lib/accrual-filters";
import { resolveFinancePanelTab } from "@/lib/finance-tab";
import { loadPropertyDuesPageData } from "@/lib/load-property-dues-data";
import { getPropertyService, getPropertySettingsService } from "@/lib/services";

const SIMPLE_DUES_TABS = new Set<DuesTab>(["register", "accrual", "expenses", "definitions", "cashboxes"]);

type Props = {
  params: Promise<{ locale: string; propertyId: string }>;
  searchParams: Promise<{
    page?: string;
    tab?: string;
    q?: string;
    blockId?: string;
    overdueOnly?: string;
    withDebtOnly?: string;
    unitId?: string;
    runId?: string;
    year?: string;
    month?: string;
    accrualYear?: string;
    accrualMonth?: string;
    accrualUnitId?: string;
    accrualDefinitionId?: string;
    section?: string;
    staffProfileId?: string;
    staffPage?: string;
  }>;
};

export default async function PropertyDuesPage({ params, searchParams }: Props) {
  const { locale, propertyId } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  const session = await getAdminSession();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    redirect(`/${locale}/login`);
  }

  const isStaffUser = isStaffRole(session.user.role);
  await requireAdminPropertyScope(locale, propertyId, isStaffUser ? "meters" : undefined);

  const redirectTab = shouldRedirectLegacyDuesTab(sp.tab, sp.section ?? null);
  if (redirectTab) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(sp)) {
      if (value != null && key !== "tab" && key !== "section") {
        params.set(key, value);
      }
    }
    params.set("tab", redirectTab);
    redirect(`/${locale}/admin/properties/${propertyId}/dues?${params.toString()}`);
  }

  const organizationId = session.user.organizationId;
  const property = await getPropertyService().getById(organizationId, propertyId);
  if (!property) notFound();

  const activeTab = resolveDuesTab(sp.tab);
  const propertyUiMode = propertyUiModeFromDb(property.adminUiMode);
  const isSimpleUiMode =
    propertyUiMode === "simple" && !canOverrideSimpleUiMode(session.user.role);

  if (isSimpleUiMode && !SIMPLE_DUES_TABS.has(activeTab)) {
    redirect(`/${locale}/admin/properties/${propertyId}/dues?tab=register`);
  }

  if (isStaffUser && activeTab !== "meters") {
    redirect(`/${locale}/admin/properties/${propertyId}/dues?tab=meters`);
  }

  const ctx = { organizationId, propertyId, actorUserId: session.user.id };
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const now = new Date();
  const registerFilters = {
    q: sp.q?.trim() ?? "",
    blockId: sp.blockId ?? null,
    overdueOnly: sp.overdueOnly === "1",
    withDebtOnly: sp.withDebtOnly === "1",
    year: Number(sp.year ?? now.getFullYear()),
    month: Number(sp.month ?? now.getMonth() + 1),
  };

  const accrualPeriod = {
    year: registerFilters.year,
    month: registerFilters.month,
  };

  const accrualFilters = parseAccrualFilters({
    accrualYear: sp.accrualYear,
    accrualMonth: sp.accrualMonth,
    accrualUnitId: sp.accrualUnitId,
    accrualDefinitionId: sp.accrualDefinitionId,
  });

  const duesData = await loadPropertyDuesPageData({
    ctx,
    activeTab,
    page,
    registerFilters,
    accrualPeriod,
    staffProfileId: sp.staffProfileId ?? null,
    staffStatementPage: Math.max(1, Number(sp.staffPage ?? "1") || 1),
  });

  const recommendations = await getPropertySettingsService().getRecommendedDefaults(organizationId, propertyId);

  const t = await getTranslations("dues");
  const tRegister = await getTranslations("periodRegister");
  const tFinance = await getTranslations("finance");
  const tCommon = await getTranslations("common");

  const financePanel = resolveFinancePanelTab(activeTab);
  const pageTitle =
    activeTab === "register"
      ? tRegister("title")
      : activeTab === "accrual"
        ? t("tabAccrual")
        : activeTab === "lateFee"
          ? t("tabLateFee")
          : activeTab === "definitions"
            ? t("definitionsList")
            : financePanel === "ledger"
          ? tFinance("tabLedger")
          : financePanel === "cashboxes"
            ? tFinance("tabCashboxes")
              : financePanel === "accounts"
                ? tFinance("tabAccounts")
                : financePanel === "staffAccounts"
                  ? tFinance("tabStaffAccounts")
                  : financePanel === "categories"
                    ? tFinance("tabCategories")
                    : t("unifiedTitle");
  const pageSubtitle =
    activeTab === "register"
      ? tRegister("subtitle")
      : financePanel
        ? tFinance("subtitle")
        : t("unifiedSubtitle");

  const helpModuleKey =
    activeTab === "register"
      ? "register"
      : activeTab === "accrual"
        ? "accrual"
        : "dues";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 px-0">
            <Link href={isStaffUser ? `/${locale}/admin/properties` : `/${locale}/admin/properties/${propertyId}/dashboard`}>
              ← {tCommon("back")}
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {property.name} — {pageTitle}
          </h1>
          <p className="text-sm text-muted-foreground">{pageSubtitle}</p>
        </div>
        {!isStaffUser ? <HelpButton topicKey={helpModuleKey} /> : null}
      </div>

      {!isStaffUser && !isSimpleUiMode ? (
        <Suspense fallback={null}>
          <DuesPageTabs locale={locale} propertyId={propertyId} activeTab={activeTab} />
        </Suspense>
      ) : null}

      {!isStaffUser && isSimpleUiMode ? (
        <SimpleDuesHub locale={locale} propertyId={propertyId} activeTab={activeTab} />
      ) : null}

      <DuesTabs
        key={`${sp.tab ?? "register"}-${sp.unitId ?? ""}-${registerFilters.year}-${registerFilters.month}-${sp.accrualYear ?? ""}-${sp.accrualMonth ?? ""}-${sp.accrualUnitId ?? ""}-${sp.accrualDefinitionId ?? ""}-${sp.runId ?? ""}-${sp.staffProfileId ?? ""}-${sp.staffPage ?? ""}`}
        locale={locale}
        propertyId={propertyId}
        definitions={duesData.definitions}
        runs={duesData.runs}
        runLinesByRunId={duesData.runLinesByRunId}
        runCorrectionsByRunId={duesData.runCorrectionsByRunId}
        registerPage={duesData.registerPage}
        blocks={duesData.blocks}
        registerFilters={registerFilters}
        cashboxes={duesData.cashboxes}
        lateFeePolicy={duesData.lateFeePolicy}
        accrualWarnings={duesData.accrualWarnings}
        meters={duesData.meters}
        meterUnits={duesData.meterUnits}
        readingsByMeterId={duesData.readingsByMeterId}
        period={duesData.period}
        categories={duesData.categories}
        accounts={duesData.accounts}
        ledger={duesData.ledger}
        orgParties={duesData.orgParties}
        staffProfiles={duesData.staffProfiles}
        staffStatement={duesData.staffStatement}
        initialTab={sp.tab}
        initialStaffProfileId={sp.staffProfileId ?? null}
        initialUnitId={sp.unitId ?? null}
        initialRunId={sp.runId ?? null}
        accrualFilters={accrualFilters}
        accrualUnits={duesData.accrualUnits}
        monthlyWorkflow={duesData.monthlyWorkflow}
        staffOperationsOnly={isStaffUser}
        canManageMeters={!isStaffUser}
        defaultCalculationMode={recommendations?.recommendedCalculationMode}
      />
    </div>
  );
}
