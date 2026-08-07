import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { requireAdminPropertyScope } from "@/lib/admin-property-scope";
import { canManageOrgUsers, canMutateAdminData } from "@/lib/auth-context";
import { isTenantDatabaseIsolationEnabled } from "@/lib/platform-features";
import { PropertyDashboardPanel } from "@/components/property-dashboard-panel";
import { PropertyTenantPanel } from "@/components/property-tenant-panel";
import { Button } from "@/components/ui/button";
import { getFinanceService, getPropertyTenantService, getReportingService, getStaffFinanceService, getUnitService } from "@/lib/services";

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

  const [dashboard, setup, recentLedgerPage, unitsPage, staffSummary] = await Promise.all([
    reporting.propertyDashboard(filter),
    reporting.propertySetupStatus(organizationId, propertyId),
    finance.listLedger({ ...ctx, page: 1, pageSize: 5 }),
    getUnitService().list({ organizationId, propertyId, page: 1, pageSize: 500 }),
    getStaffFinanceService().getStaffSummary(ctx),
  ]);

  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");
  const showDatabaseIsolation =
    isTenantDatabaseIsolationEnabled() && canManageOrgUsers(session);

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 px-0">
          <Link href={`/${locale}/admin/properties`}>← {tCommon("back")}</Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          {property.name} — {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <PropertyDashboardPanel
        locale={locale}
        propertyId={propertyId}
        dashboard={dashboard}
        setup={setup}
        recentLedger={recentLedgerPage.items}
        staffSummary={staffSummary}
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
    </div>
  );
}
