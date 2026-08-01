"use client";

import type { LegalInterestRateDto } from "@siteyonetim/finance-dues";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { upsertLegalInterestRateAction, type LegalInterestActionState } from "@/app/actions/legal-interest";
import { FormDrawer } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Props = {
  locale: string;
  year: number;
  rates: LegalInterestRateDto[];
};

const initial: LegalInterestActionState = {};

export function LegalInterestPanel({ locale, year, rates }: Props) {
  const t = useTranslations("legalInterest");
  const [state, action, pending] = useActionState(upsertLegalInterestRateAction.bind(null, locale), initial);
  const byMonth = new Map(rates.map((r) => [r.month, r]));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>{t("title", { year })}</CardTitle>
          <FormDrawer triggerLabel={t("addRate")} title={t("addRate")} success={state.success}>
            <form action={action} className="grid gap-3">
              <input type="hidden" name="year" value={year} />
              <div className="grid gap-2">
                <Label htmlFor="li-month">{t("month")}</Label>
                <Input id="li-month" name="month" type="number" min={1} max={12} required />
              </div>
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
                    <TableCell>{month}</TableCell>
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
