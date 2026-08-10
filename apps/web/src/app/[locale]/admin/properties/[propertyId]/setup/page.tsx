import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { HelpButton } from "@/components/help-button";
import { PropertySetupHub } from "@/components/property-setup-hub";
import { PropertySimpleModeBanner } from "@/components/property-simple-mode-banner";
import { PropertyUiModeToggle } from "@/components/property-ui-mode-toggle";
import { Button } from "@/components/ui/button";
import { requireAdminPropertyScope } from "@/lib/admin-property-scope";
import { canMutateAdminData } from "@/lib/auth-context";
import { propertyUiModeFromDb } from "@/lib/admin-nav-capabilities-types";
import { getPropertySettingsService, getReportingService } from "@/lib/services";

type Props = {
  params: Promise<{ locale: string; propertyId: string }>;
};

export default async function PropertySetupPage({ params }: Props) {
  const { locale, propertyId } = await params;
  setRequestLocale(locale);

  const { session, organizationId, property } = await requireAdminPropertyScope(locale, propertyId);
  const canMutate = canMutateAdminData(session);
  const propertyUiMode = propertyUiModeFromDb(property.adminUiMode);

  const [setup, recommendations] = await Promise.all([
    getReportingService().propertySetupStatus(organizationId, propertyId),
    getPropertySettingsService().getRecommendedDefaults(organizationId, propertyId),
  ]);

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
          {canMutate && propertyUiMode === "standard" ? (
            <PropertyUiModeToggle
              locale={locale}
              propertyId={propertyId}
              targetMode="simple"
              variant="outline"
              size="sm"
            />
          ) : null}
          <HelpButton topicKey="setup" />
        </div>
      </div>

      <PropertySimpleModeBanner
        locale={locale}
        propertyId={propertyId}
        userRole={session.user.role}
        canMutate={canMutate}
      />

      <PropertySetupHub
        locale={locale}
        propertyId={propertyId}
        setup={setup}
        recommendations={recommendations}
        canMutate={canMutate}
      />
    </div>
  );
}
