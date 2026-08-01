"use client";

import type { AccrualContextWarningsDto } from "@siteyonetim/finance-dues";
import { AlertTriangle, Info } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  locale: string;
  propertyId: string;
  warnings: AccrualContextWarningsDto;
};

function severityClass(severity: AccrualContextWarningsDto["warnings"][number]["severity"]) {
  if (severity === "error") {
    return "border-destructive/40 bg-destructive/5 text-destructive";
  }
  if (severity === "warning") {
    return "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400";
  }
  return "border-border bg-muted/30 text-muted-foreground";
}

export function AccrualContextAlerts({ locale, propertyId, warnings }: Props) {
  const t = useTranslations("accrualContext");
  const base = `/${locale}/admin/properties/${propertyId}`;

  if (warnings.warnings.length === 0) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-start gap-2 py-4 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <p>{t("ready")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {warnings.warnings.map((warning, index) => (
          <div
            key={`${warning.code}-${warning.runId ?? warning.definitionId ?? index}`}
            className={`rounded-md border px-3 py-2 text-sm ${severityClass(warning.severity)}`}
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <div className="min-w-0 space-y-2">
                <p>{t(`codes.${warning.code}`, warning.count != null ? { count: warning.count } : {})}</p>
                {warning.code === "NO_DEFINITIONS" ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`${base}/dues?tab=definitions`}>{t("actions.addDefinition")}</Link>
                  </Button>
                ) : null}
                {warning.code === "UNITS_WITHOUT_OCCUPANCY" ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`${base}?tab=units`}>{t("actions.assignParties")}</Link>
                  </Button>
                ) : null}
                {(warning.code === "INCOMPLETE_METER_READINGS" ||
                  warning.code === "NO_METER_CONSUMPTION" ||
                  warning.code === "MISSING_PREVIOUS_MONTH_INDEX") && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`${base}/dues?tab=meters`}>{t("actions.openMeters")}</Link>
                  </Button>
                )}
                {warning.code === "POSTED_ACCRUAL_INCOMPLETE" ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`${base}/dues?tab=accrual`}>{t("actions.reviewPostedAccruals")}</Link>
                  </Button>
                ) : null}
                {warning.code === "DRAFT_ACCRUAL_PENDING" ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`${base}/dues?tab=accrual`}>{t("actions.reviewDrafts")}</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
        {!warnings.canGenerateAccrual ? (
          <p className="text-sm text-muted-foreground">{t("blockedGenerate")}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
