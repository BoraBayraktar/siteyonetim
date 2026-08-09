"use client";

import type { PropertyRecommendedDefaultsDto } from "@siteyonetim/property-settings";
import type { PropertySetupStatusDto } from "@siteyonetim/reporting-standard";
import { Building2, Coins, LayoutGrid, Wallet } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { PropertyRecommendedDefaultsPanel } from "@/components/property-recommended-defaults-panel";
import { PropertySetupChecklist } from "@/components/property-setup-checklist";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  locale: string;
  propertyId: string;
  setup: PropertySetupStatusDto;
  recommendations: PropertyRecommendedDefaultsDto;
  canMutate: boolean;
};

export function PropertySetupHub({ locale, propertyId, setup, recommendations, canMutate }: Props) {
  const t = useTranslations("setupHub");
  const base = `/${locale}/admin/properties/${propertyId}`;

  const shortcuts = [
    {
      key: "units",
      href: `${base}?tab=units`,
      title: t("shortcutUnits"),
      description: t("shortcutUnitsDesc"),
      icon: Building2,
    },
    {
      key: "definitions",
      href: `${base}/dues?tab=definitions`,
      title: t("shortcutDefinitions"),
      description: t("shortcutDefinitionsDesc"),
      icon: Coins,
    },
    {
      key: "cashboxes",
      href: `${base}/dues?tab=cashboxes`,
      title: t("shortcutCashbox"),
      description: t("shortcutCashboxDesc"),
      icon: Wallet,
    },
    {
      key: "blocks",
      href: `${base}?tab=blocks`,
      title: t("shortcutBlocks"),
      description: t("shortcutBlocksDesc"),
      icon: LayoutGrid,
    },
  ] as const;

  return (
    <div className="space-y-6">
      <PropertyRecommendedDefaultsPanel
        locale={locale}
        propertyId={propertyId}
        recommendations={recommendations}
        canMutate={canMutate}
      />
      <PropertySetupChecklist locale={locale} propertyId={propertyId} setup={setup} />
      <section aria-labelledby="setup-shortcuts-title">
        <h2 id="setup-shortcuts-title" className="mb-3 text-base font-semibold">
          {t("shortcutsTitle")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {shortcuts.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="h-full transition-colors hover:bg-muted/30">
                <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
                  <item.icon className="size-5 shrink-0 text-primary" aria-hidden />
                  <div className="min-w-0">
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <CardDescription className="mt-1">{item.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs font-medium text-primary">{t("openShortcut")}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
