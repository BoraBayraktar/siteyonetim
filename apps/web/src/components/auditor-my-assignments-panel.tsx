"use client";

import type { AuditorAssignmentDto } from "@siteyonetim/reporting-auditor";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  locale: string;
  propertyId: string;
  assignments: AuditorAssignmentDto[];
};

export function AuditorMyAssignmentsPanel({ locale, propertyId, assignments }: Props) {
  const t = useTranslations("auditorReport");

  if (assignments.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("myAssignmentsTitle")}</CardTitle>
        <CardDescription>{t("myAssignmentsSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {assignments.map((row) => (
          <div
            key={row.id}
            className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-1">
              <p className="font-medium">
                {row.year} — {t(`periods.${row.period}`)}
              </p>
              <p className="text-sm text-muted-foreground">
                {row.reportStatus ? (
                  <Badge variant="secondary">{t(`status.${row.reportStatus}`)}</Badge>
                ) : (
                  t("noReportYet")
                )}
              </p>
            </div>
            <Button asChild size="sm" className="shrink-0">
              <Link href={`/${locale}/auditor/properties/${propertyId}/reports/audit/${row.id}`}>
                {t("openEditor")}
              </Link>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
