import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { requireAdminPropertyScope } from "@/lib/admin-property-scope";
import { canMutateAdminData } from "@/lib/auth-context";
import { AdminOnboardingTour } from "@/components/admin-onboarding-tour";
import { HelpButton } from "@/components/help-button";
import { PropertyDashboardPanel } from "@/components/property-dashboard-panel";
import { Button } from "@/components/ui/button";
import { getFinanceService, getPropertySettingsService, getReportingService, getStaffFinanceService, getUserPreferenceService } from "@/lib/services";

type Props = {
  params: Promise<{ locale: string; propertyId: string }>;
};

export default async function PropertyDashboardPage({ params }: Props) {
  const { locale, propertyId } = await params;
  setRequestLocale(locale);

  const { session, organizationId, property, actorUserId } = await requireAdminPropertyScope(locale, propertyId);

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

  const [dashboard, setup, recentLedgerPage, staffSummary, monthlyTasks, monthlyWorkflow, onboarding, recommendations] =
    await Promise.all([
    reporting.propertyDashboard(filter),
    reporting.propertySetupStatus(organizationId, propertyId),
    finance.listLedger({ ...ctx, page: 1, pageSize: 5 }),
    getStaffFinanceService().getStaffSummary(ctx),
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

  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");

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
          <HelpButton topicKey="dashboard" />
        </div>
      </div>

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
    </div>
  );
}
