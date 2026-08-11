"use client";

import type { LegalInterestRateDto } from "@siteyonetim/finance-dues";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useMemo } from "react";

import { upsertLegalInterestRateAction, type LegalInterestActionState } from "@/app/actions/legal-interest";
import { FormDrawer } from "@/components/form-drawer";
import { YearMonthFormFields } from "@/components/year-month-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { turkishMonthName } from "@/lib/period-options";

type Props = {
  locale: string;
  year: number;
  years: number[];
  rates: LegalInterestRateDto[];
};

const initial: LegalInterestActionState = {};

export function LegalInterestPanel({ locale, year, years, rates }: Props) {
  const t = useTranslations("legalInterest");
  const router = useRouter();
  const [state, action, pending] = useActionState(upsertLegalInterestRateAction.bind(null, locale), initial);
  const byMonth = new Map(rates.map((r) => [r.month, r]));

  const addRatePeriods = useMemo(() => {
    const used = new Set(rates.map((rate) => rate.month));
    return Array.from({ length: 12 }, (_, index) => index + 1)
      .filter((month) => !used.has(month))
      .map((month) => ({ year, month }));
  }, [rates, year]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>{t("title", { year })}</CardTitle>
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="legal-interest-year">{t("year")}</Label>
              <Select
                value={String(year)}
                onValueChange={(value) => router.push(`/${locale}/admin/legal-interest?year=${value}`)}
              >
                <SelectTrigger id="legal-interest-year" className="w-28 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((optionYear) => (
                    <SelectItem key={optionYear} value={String(optionYear)}>
                      {optionYear}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <FormDrawer triggerLabel={t("addRate")} title={t("addRate")} helpTopicKey="legalInterest" success={state.success}>
              <form action={action} className="grid gap-3">
                <input type="hidden" name="year" value={year} />
                <YearMonthFormFields
                  periods={addRatePeriods}
                  defaultYear={year}
                  defaultMonth={new Date().getMonth() + 1}
                  yearLabel={t("year")}
                  monthLabel={t("month")}
                  yearId="li-year"
                  monthId="li-month"
                  yearReadOnly
                />
                <div className="grid gap-2">
                  <Label htmlFor="li-annual">{t("annualRate")}</Label>
                  <Input id="li-annual" name="annualRatePercent" required />
                  <p className="text-xs text-muted-foreground">{t("annualRateHint")}</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="li-notes">{t("notes")}</Label>
                  <Input id="li-notes" name="notes" />
                </div>
                {state.error ? <p className="text-sm text-destructive">{t(`errors.${state.error}`)}</p> : null}
                <Button type="submit" disabled={pending}>
                  {t("save")}
                </Button>
              </form>
            </FormDrawer>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">{t("description")}</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("month")}</TableHead>
                <TableHead>{t("annualRate")}</TableHead>
                <TableHead>{t("monthlyEquivalent")}</TableHead>
                <TableHead>{t("notes")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                const row = byMonth.get(month);
                const annual = row ? Number(row.annualRatePercent) : null;
                const monthlyEq = annual != null ? (annual / 12).toFixed(4) : "—";
                return (
                  <TableRow key={month}>
                    <TableCell>{turkishMonthName(month)}</TableCell>
                    <TableCell>{row?.annualRatePercent ?? "—"}</TableCell>
                    <TableCell>{monthlyEq}</TableCell>
                    <TableCell className="max-w-[12rem] truncate">{row?.notes ?? ""}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
