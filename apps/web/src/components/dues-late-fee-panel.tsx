"use client";

import { LateFeeRateKind } from "@siteyonetim/db";
import type { DueAccrualRunDto, DueLateFeePolicyDto } from "@siteyonetim/finance-dues";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState, useMemo, useState } from "react";

import { applyLateFeesAction, upsertLateFeePolicyAction, type DuesActionState } from "@/app/actions/dues";
import { LateFeeDecisionGuide } from "@/components/late-fee-decision-guide";
import { YearMonthFormFields } from "@/components/year-month-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  DEFAULT_CONTRACTUAL_RATE,
  isLateFeeEnabled,
  LATE_FEE_UI_MODES,
  resolveLateFeeUiMode,
  type LateFeeUiMode,
} from "@/lib/late-fee-form";
import { cn } from "@/lib/utils";
import { periodsFromAccrualRuns } from "@/lib/period-options";

type Props = {
  locale: string;
  propertyId: string;
  policy: DueLateFeePolicyDto | null;
  defaultPeriod: { year: number; month: number };
  runs: DueAccrualRunDto[];
};

const initial: DuesActionState = {};

function modeLabel(mode: LateFeeUiMode, t: ReturnType<typeof useTranslations<"dues">>): string {
  if (mode === "NONE") return t("lateFeeModeNone");
  if (mode === LateFeeRateKind.LEGAL_TCMB) return t("lateFeeModeLegal");
  return t("lateFeeModeFixed");
}

function modeDescription(mode: LateFeeUiMode, t: ReturnType<typeof useTranslations<"dues">>): string {
  if (mode === "NONE") return t("lateFeeModeNoneHint");
  if (mode === LateFeeRateKind.LEGAL_TCMB) return t("lateFeeModeLegalHint");
  return t("lateFeeModeFixedHint");
}

export function DuesLateFeePanel({ locale, propertyId, policy, defaultPeriod, runs }: Props) {
  const t = useTranslations("dues");
  const applyPeriods = useMemo(() => periodsFromAccrualRuns(runs, true), [runs]);
  const [mode, setMode] = useState<LateFeeUiMode>(() => resolveLateFeeUiMode(policy));
  const [policyState, policyAction, policyPending] = useActionState(
    upsertLateFeePolicyAction.bind(null, locale, propertyId),
    initial,
  );
  const [applyState, applyAction, applyPending] = useActionState(
    applyLateFeesAction.bind(null, locale, propertyId),
    initial,
  );
  const enabled = isLateFeeEnabled(mode);
  const policySavedActive = Boolean(policy?.active);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <LateFeeDecisionGuide locale={locale} propertyId={propertyId} />
      <Card>
      <CardHeader>
        <CardTitle>{t("lateFeeCardTitle")}</CardTitle>
        <CardDescription>{t("lateFeeCardSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form action={policyAction} className="grid gap-4">
          <input type="hidden" name="lateFeeMode" value={mode} />

          <div className="grid gap-2">
            <Label>{t("lateFeeChooseMode")}</Label>
            <div className="grid gap-2">
              {LATE_FEE_UI_MODES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMode(option)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors hover:bg-accent",
                    mode === option && "border-primary bg-accent",
                  )}
                >
                  <p className="text-sm font-medium">{modeLabel(option, t)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{modeDescription(option, t)}</p>
                </button>
              ))}
            </div>
          </div>

          {mode === LateFeeRateKind.CONTRACTUAL ? (
            <div className="grid gap-2">
              <Label htmlFor="rate">{t("lateFeeRate")}</Label>
              <Input
                id="rate"
                name="monthlyRatePercent"
                defaultValue={policy?.monthlyRatePercent ?? DEFAULT_CONTRACTUAL_RATE}
                required
              />
              <p className="text-xs text-muted-foreground">{t("lateFeeRateHint")}</p>
            </div>
          ) : null}

          {mode === LateFeeRateKind.LEGAL_TCMB ? (
            <div className="grid gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              <p>{t("lateFeeLegalHint")}</p>
              {policy?.effectiveMonthlyRatePercent ? (
                <p>{t("lateFeeEffectiveMonthly", { rate: policy.effectiveMonthlyRatePercent })}</p>
              ) : (
                <p className="text-destructive">{t("lateFeeLegalMissing")}</p>
              )}
              <Link
                href={`/${locale}/admin/legal-interest`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {t("lateFeeLegalLink")}
              </Link>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="grace">{t("graceDays")}</Label>
              <Input id="grace" name="graceDays" type="number" min={0} defaultValue={policy?.graceDays ?? 0} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="due-day">{t("dueDayOfMonth")}</Label>
              <Input
                id="due-day"
                name="dueDayOfMonth"
                type="number"
                min={1}
                max={28}
                defaultValue={policy?.dueDayOfMonth ?? 1}
              />
            </div>
          </div>

          {policyState.error ? (
            <p className="text-sm text-destructive">
              {t(`errors.${policyState.error}`, { defaultMessage: policyState.error })}
            </p>
          ) : null}
          {policyState.success ? <p className="text-sm text-muted-foreground">{t("lateFeePolicySaved")}</p> : null}

          <Button type="submit" disabled={policyPending}>
            {t("lateFeePolicySave")}
          </Button>
        </form>

        <Separator />

        <div className="grid gap-3">
          <div>
            <p className="text-sm font-medium">{t("lateFeeApplyTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("lateFeeApplyHint")}</p>
          </div>

          {!enabled || !policySavedActive ? (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm text-amber-800 dark:text-amber-400">
              {t("lateFeeApplyDisabledHint")}
            </p>
          ) : null}

          <form action={applyAction} className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <YearMonthFormFields
                periods={applyPeriods}
                defaultYear={defaultPeriod.year}
                defaultMonth={defaultPeriod.month}
                yearLabel={t("year")}
                monthLabel={t("month")}
                yearId="late-fee-year"
                monthId="late-fee-month"
                disabled={!enabled || !policySavedActive}
              />
            </div>
            {applyState.error ? (
              <p className="text-sm text-destructive">
                {t(`errors.${applyState.error}`, { defaultMessage: applyState.error })}
              </p>
            ) : null}
            {applyState.success ? <p className="text-sm text-muted-foreground">{t("lateFeeApplied")}</p> : null}
            <Button type="submit" variant="secondary" disabled={applyPending || !enabled || !policySavedActive}>
              {t("lateFeeApplyButton")}
            </Button>
          </form>

          {applyState.success ? (
            <Button variant="outline" asChild>
              <Link href={`/${locale}/admin/properties/${propertyId}/dues?tab=accrual`}>
                {t("lateFeeApplyGoAccrual")}
              </Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
