"use client";

import type {
  PropertyMonthlyWorkflowDto,
  PropertyMonthlyWorkflowStepId,
} from "@siteyonetim/reporting-standard";
import { CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  locale: string;
  propertyId: string;
  workflow: PropertyMonthlyWorkflowDto;
  compact?: boolean;
};

function stepHref(locale: string, propertyId: string, stepId: PropertyMonthlyWorkflowStepId): string {
  const base = `/${locale}/admin/properties/${propertyId}`;
  switch (stepId) {
    case "METER_READINGS":
      return `${base}/dues?tab=meters`;
    case "GENERATE_ACCRUAL":
    case "POST_ACCRUAL":
      return `${base}/dues?tab=accrual`;
    case "SEND_REMINDERS":
      return `${base}/notifications`;
    case "REVIEW_OVERDUE":
      return `${base}/dues?tab=register&overdueOnly=1`;
    case "DOWNLOAD_REPORT":
      return `${base}/reports`;
    default:
      return `${base}/dashboard`;
  }
}

export function PropertyMonthlyWorkflowPanel({ locale, propertyId, workflow, compact = false }: Props) {
  const t = useTranslations("workflow");
  const periodLabel = `${workflow.period.month}/${workflow.period.year}`;
  const progressPercent =
    workflow.totalCount > 0 ? Math.round((workflow.completedCount / workflow.totalCount) * 100) : 0;

  return (
    <Card className={compact ? "border-dashed" : undefined}>
      <CardHeader className={compact ? "pb-2" : undefined}>
        <CardTitle className={compact ? "text-sm" : "text-base"}>
          {t("title", { period: periodLabel })}
        </CardTitle>
        {!compact ? (
          <p className="text-sm text-muted-foreground">
            {t("progress", { completed: workflow.completedCount, total: workflow.totalCount, percent: progressPercent })}
          </p>
        ) : null}
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressPercent}%` }}
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <ol className="space-y-2">
          {workflow.steps.map((step, index) => (
            <li
              key={step.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                {step.complete ? (
                  <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden />
                ) : (
                  <Circle className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {index + 1}. {t(`steps.${step.id}`)}
                    {step.optional ? (
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        ({t("optional")})
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>
              {!step.complete ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={stepHref(locale, propertyId, step.id)}>{t("goToStep")}</Link>
                </Button>
              ) : null}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
