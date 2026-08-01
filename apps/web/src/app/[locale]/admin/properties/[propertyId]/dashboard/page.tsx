import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { getAdminSession } from "@/lib/cached-admin";
import { assertAdminPropertyAccess, canManageOrgUsers, canMutateAdminData } from "@/lib/auth-context";
import { isTenantDatabaseIsolationEnabled } from "@/lib/platform-features";
import { PropertyDashboardPanel } from "@/components/property-dashboard-panel";
import { PropertyTenantPanel } from "@/components/property-tenant-panel";
import { Button } from "@/components/ui/button";
import { getFinanceService, getPropertyService, getPropertyTenantService, getReportingService, getUnitService } from "@/lib/services";

type Props = {
  params: Promise<{ locale: string; propertyId: string }>;
};

export default async function PropertyDashboardPage({ params }: Props) {
  const { locale, propertyId } = await params;
  setRequestLocale(locale);

  const session = await getAdminSession();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    redirect(`/${locale}/login`);
  }

  const organizationId = session.user.organizationId;
  const property = await getPropertyService().getById(organizationId, propertyId);
  if (!property) {
    notFound();
  }

  try {
    await assertAdminPropertyAccess(session, propertyId);
  } catch {
    notFound();
  }

  const tenantService = getPropertyTenantService();
  let tenant = await tenantService.getByPropertyId(organizationId, propertyId);
  if (!tenant) {
    tenant = await tenantService.provisionPropertyTenant({
      organizationId,
      propertyId,
      propertyName: property.name,
      actorUserId: session.user.id,
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
    actorUserId: session.user.id,
  };
  const ctx = { organizationId, propertyId, actorUserId: session.user.id };

  const reporting = getReportingService();
  const finance = getFinanceService();

  const [dashboard, setup, recentLedgerPage, unitsPage] = await Promise.all([
    reporting.propertyDashboard(filter),
    reporting.propertySetupStatus(organizationId, propertyId),
    finance.listLedger({ ...ctx, page: 1, pageSize: 5 }),
    getUnitService().list({ organizationId, propertyId, page: 1, pageSize: 500 }),
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
