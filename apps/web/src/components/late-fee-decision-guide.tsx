"use client";

import { Info } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type Props = {
  locale: string;
  propertyId: string;
  showLegalInterestLink?: boolean;
  className?: string;
};

export function LateFeeDecisionGuide({
  locale,
  propertyId,
  showLegalInterestLink = true,
  className,
}: Props) {
  const t = useTranslations("lateFeeGuide");
  const base = `/${locale}/admin/properties/${propertyId}/dues`;

  return (
    <Alert variant="info" className={className}>
      <Info className="size-4" aria-hidden />
      <AlertTitle>{t("title")}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{t("intro")}</p>
        <ul className="space-y-2 text-sm">
          <li>
            <span className="font-medium text-foreground">{t("aidatTitle")}</span>
            <span className="text-muted-foreground"> — {t("aidatDesc")}</span>
            <Button variant="link" size="sm" className="h-auto px-0 text-sm" asChild>
              <Link href={`${base}?tab=lateFee`}>{t("aidatAction")}</Link>
            </Button>
          </li>
          <li>
            <span className="font-medium text-foreground">{t("supplierTitle")}</span>
            <span className="text-muted-foreground"> — {t("supplierDesc")}</span>
            <Button variant="link" size="sm" className="h-auto px-0 text-sm" asChild>
              <Link href={`${base}?tab=definitions`}>{t("supplierAction")}</Link>
            </Button>
          </li>
          <li>
            <span className="font-medium text-foreground">{t("legalTitle")}</span>
            <span className="text-muted-foreground"> — {t("legalDesc")}</span>
            {showLegalInterestLink ? (
              <Button variant="link" size="sm" className="h-auto px-0 text-sm" asChild>
                <Link href={`/${locale}/admin/legal-interest`}>{t("legalAction")}</Link>
              </Button>
            ) : null}
          </li>
        </ul>
      </AlertDescription>
    </Alert>
  );
}
