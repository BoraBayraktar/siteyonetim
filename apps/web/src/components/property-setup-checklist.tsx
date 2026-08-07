"use client";

import type { PropertySetupStatusDto, PropertySetupStepId } from "@siteyonetim/reporting-standard";
import { CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  locale: string;
  propertyId: string;
  setup: PropertySetupStatusDto;
};

function stepHref(locale: string, propertyId: string, stepId: PropertySetupStepId): string {
  const base = `/${locale}/admin/properties/${propertyId}`;
  switch (stepId) {
    case "BLOCKS":
      return `${base}?tab=blocks`;
    case "UNITS":
      return `${base}?tab=units`;
    case "PARTIES_OCCUPANCY":
      return `${base}?tab=units`;
    case "DUES_DEFINITIONS":
      return `${base}/dues?tab=definitions`;
    case "CASHBOX":
      return `${base}/dues?tab=cashboxes`;
    case "FIRST_ACCRUAL":
      return `${base}/dues?tab=accrual`;
    case "STAFF_PROFILE":
      return `${base}/dues?tab=staffAccounts`;
    default:
      return base;
  }
}

function stepProgress(step: PropertySetupStatusDto["steps"][number]): string | null {
  if (step.id === "PARTIES_OCCUPANCY" && step.target > 0) {
    return `${step.current}/${step.target}`;
  }
  if (step.target > 0 && step.current > 0) {
    return String(step.current);
  }
  return null;
}

export function PropertySetupChecklist({ locale, propertyId, setup }: Props) {
  const t = useTranslations("setup");

  if (setup.isComplete && setup.optionalSteps.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base">{t("title")}</CardTitle>
          {!setup.isComplete ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {t("progress", { completed: setup.completedCount, total: setup.totalCount })}
            </p>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!setup.isComplete ? (
          <ul className="space-y-2">
            {setup.steps.map((step) => {
              const progress = stepProgress(step);
              return (
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
                      <p className="text-sm font-medium">{t(`steps.${step.id}`)}</p>
                      {progress ? (
                        <p className="text-xs text-muted-foreground">{t("stepCount", { count: progress })}</p>
                      ) : null}
                    </div>
                  </div>
                  {!step.complete ? (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={stepHref(locale, propertyId, step.id)}>{t("goToStep")}</Link>
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
        {setup.optionalSteps.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{t("optionalTitle")}</p>
            <ul className="space-y-2">
              {setup.optionalSteps.map((step) => (
                <li
                  key={step.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Circle className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{t(`steps.${step.id}`)}</p>
                      <p className="text-xs text-muted-foreground">{t("optionalHint")}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={stepHref(locale, propertyId, step.id)}>{t("goToStep")}</Link>
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
