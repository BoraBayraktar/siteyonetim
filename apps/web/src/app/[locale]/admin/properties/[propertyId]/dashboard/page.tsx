import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { requireAdminPropertyScope } from "@/lib/admin-property-scope";
import { canManageOrgUsers, canMutateAdminData } from "@/lib/auth-context";
import { propertyUiModeFromDb } from "@/lib/admin-nav-capabilities-types";
import { isTenantDatabaseIsolationEnabled } from "@/lib/platform-features";
import { PaymentSettingsPanel } from "@/components/payment-settings-panel";
import { AdminOnboardingTour } from "@/components/admin-onboarding-tour";
import { HelpButton } from "@/components/help-button";
import { PropertyDashboardPanel } from "@/components/property-dashboard-panel";
import { PropertySimpleModeBanner } from "@/components/property-simple-mode-banner";
import { PropertyTenantPanel } from "@/components/property-tenant-panel";
import { PropertyUiModeToggle } from "@/components/property-ui-mode-toggle";
import { Button } from "@/components/ui/button";
import { getFinanceService, getPaymentGatewayService, getPropertySettingsService, getPropertyTenantService, getReportingService, getStaffFinanceService, getUnitService, getUserPreferenceService } from "@/lib/services";

type Props = {
  params: Promise<{ locale: string; propertyId: string }>;
};

export default async function PropertyDashboardPage({ params }: Props) {
  const { locale, propertyId } = await params;
  setRequestLocale(locale);

  const { session, organizationId, property, actorUserId } = await requireAdminPropertyScope(locale, propertyId);

  const tenantService = getPropertyTenantService();
  let tenant = await tenantService.getByPropertyId(organizationId, propertyId);
  if (!tenant) {
    tenant = await tenantService.provisionPropertyTenant({
      organizationId,
      propertyId,
      propertyName: property.name,
      actorUserId,
    });
  }
  const portalSettings =
    (await tenantService.getPortalSettings(organizationId, propertyId)) ?? {
      propertyTenantId: tenant.id,
      propertyId,
      showIncomeExpenseReport: false,
      showMemberDebtSummary: false,
      allowOnlinePayment: false,
      showAnnouncements: true,
      showDocuments: true,
      showStatement: true,
      showIncidents: true,
    };

  const now = new Date();
  const filter = {
    organizationId,
    propertyId,
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    actorUserId,
  };
  const ctx = { organizationId, propertyId, actorUserId };

  const reporting = getReportingService();
  const finance = getFinanceService();

  const [dashboard, setup, recentLedgerPage, unitsPage, staffSummary, cashboxesPage, paymentProfile, monthlyTasks, monthlyWorkflow, onboarding, recommendations] =
    await Promise.all([
    reporting.propertyDashboard(filter),
    reporting.propertySetupStatus(organizationId, propertyId),
    finance.listLedger({ ...ctx, page: 1, pageSize: 5 }),
    getUnitService().list({ organizationId, propertyId, page: 1, pageSize: 500 }),
    getStaffFinanceService().getStaffSummary(ctx),
    finance.listCashboxes(ctx),
    getPaymentGatewayService().getProfile(ctx),
    reporting.propertyMonthlyTasks(organizationId, propertyId, filter.year, filter.month),
    reporting.propertyMonthlyWorkflow(organizationId, propertyId, filter.year, filter.month),
    getUserPreferenceService().getAdminOnboardingState({
      userId: actorUserId,
      organizationId,
    }),
    getPropertySettingsService().getRecommendedDefaults(organizationId, propertyId),
  ]);

  const showOnboarding = !setup.isComplete || !onboarding.completed;
  const canMutate = canMutateAdminData(session);
  const propertyUiMode = propertyUiModeFromDb(property.adminUiMode);

  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");
  const showDatabaseIsolation =
    isTenantDatabaseIsolationEnabled() && canManageOrgUsers(session);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 px-0">
            <Link href={`/${locale}/admin/properties`}>← {tCommon("back")}</Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {property.name} — {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canMutate && propertyUiMode === "standard" ? (
            <PropertyUiModeToggle
              locale={locale}
              propertyId={propertyId}
              targetMode="simple"
              variant="outline"
              size="sm"
            />
          ) : null}
          <HelpButton topicKey="dashboard" />
        </div>
      </div>

      <PropertySimpleModeBanner
        locale={locale}
        propertyId={propertyId}
        userRole={session.user.role}
        canMutate={canMutate}
      />

      <AdminOnboardingTour
        locale={locale}
        propertyId={propertyId}
        onboarding={onboarding}
        showTour={showOnboarding}
      />

      <PropertyDashboardPanel
        locale={locale}
        propertyId={propertyId}
        dashboard={dashboard}
        setup={setup}
        monthlyTasks={monthlyTasks}
        monthlyWorkflow={monthlyWorkflow}
        recentLedger={recentLedgerPage.items}
        staffSummary={staffSummary}
        recommendations={recommendations}
        canMutate={canMutate}
      />

      <PropertyTenantPanel
        locale={locale}
        propertyId={propertyId}
        tenant={tenant}
        portalSettings={portalSettings}
        units={unitsPage.items}
        canMutate={canMutateAdminData(session)}
        showDatabaseIsolation={showDatabaseIsolation}
      />

      <PaymentSettingsPanel
        locale={locale}
        propertyId={propertyId}
        cashboxes={cashboxesPage}
        profile={paymentProfile}
        canMutate={canMutateAdminData(session)}
      />
    </div>
  );
}
