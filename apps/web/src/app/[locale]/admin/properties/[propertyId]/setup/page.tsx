import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { HelpButton } from "@/components/help-button";
import { PaymentSettingsPanel } from "@/components/payment-settings-panel";
import { PropertySetupHub } from "@/components/property-setup-hub";
import { PropertyTenantPanel } from "@/components/property-tenant-panel";
import { Button } from "@/components/ui/button";
import { requireAdminPropertyScope } from "@/lib/admin-property-scope";
import { canManageOrgUsers, canMutateAdminData } from "@/lib/auth-context";
import { isTenantDatabaseIsolationEnabled } from "@/lib/platform-features";
import {
  getFinanceService,
  getPaymentGatewayService,
  getPropertySettingsService,
  getPropertyTenantService,
  getReportingService,
  getUnitService,
} from "@/lib/services";

type Props = {
  params: Promise<{ locale: string; propertyId: string }>;
};

export default async function PropertySetupPage({ params }: Props) {
  const { locale, propertyId } = await params;
  setRequestLocale(locale);

  const { session, organizationId, property, actorUserId } = await requireAdminPropertyScope(locale, propertyId);
  const canMutate = canMutateAdminData(session);

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

  const ctx = { organizationId, propertyId, actorUserId };

  const [setup, recommendations, unitsPage, cashboxesPage, paymentProfile] = await Promise.all([
    getReportingService().propertySetupStatus(organizationId, propertyId),
    getPropertySettingsService().getRecommendedDefaults(organizationId, propertyId),
    getUnitService().list({ organizationId, propertyId, page: 1, pageSize: 500 }),
    getFinanceService().listCashboxes(ctx),
    getPaymentGatewayService().getProfile(ctx),
  ]);

  const showDatabaseIsolation = isTenantDatabaseIsolationEnabled() && canManageOrgUsers(session);

  const t = await getTranslations("setupHub");
  const tCommon = await getTranslations("common");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 px-0">
            <Link href={`/${locale}/admin/properties/${propertyId}/dashboard`}>← {tCommon("back")}</Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {property.name} — {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HelpButton topicKey="setup" />
        </div>
      </div>

      <PropertySetupHub
        locale={locale}
        propertyId={propertyId}
        setup={setup}
        recommendations={recommendations}
        canMutate={canMutate}
      />

      <PropertyTenantPanel
        locale={locale}
        propertyId={propertyId}
        tenant={tenant}
        portalSettings={portalSettings}
        units={unitsPage.items}
        canMutate={canMutate}
        showDatabaseIsolation={showDatabaseIsolation}
      />

      <PaymentSettingsPanel
        locale={locale}
        propertyId={propertyId}
        cashboxes={cashboxesPage}
        profile={paymentProfile}
        canMutate={canMutate}
      />
    </div>
  );
}
