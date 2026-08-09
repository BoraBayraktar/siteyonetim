"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { PropertyUiModeToggle } from "@/components/property-ui-mode-toggle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { usePropertyUiMode } from "@/components/property-ui-mode-context";
import { canOverrideSimpleUiMode } from "@/lib/admin-nav-capabilities";

type Props = {
  locale: string;
  propertyId: string;
  userRole?: string | null;
  canMutate: boolean;
};

export function PropertySimpleModeBanner({ locale, propertyId, userRole = null, canMutate }: Props) {
  const t = useTranslations("uiMode");
  const { propertyUiMode } = usePropertyUiMode();

  if (propertyUiMode !== "simple") {
    return null;
  }

  const override = canOverrideSimpleUiMode(userRole);

  return (
    <Alert variant="info">
      <Sparkles className="size-4" aria-hidden />
      <AlertTitle>{t("bannerTitle")}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{override ? t("bannerDescOverride") : t("bannerDesc")}</p>
        {canMutate ? (
          <PropertyUiModeToggle
            locale={locale}
            propertyId={propertyId}
            targetMode="standard"
            variant="outline"
            size="sm"
            label={t("switchToStandard")}
          />
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
