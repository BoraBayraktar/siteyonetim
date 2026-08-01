import type { PortalMemberDebtSummaryDto } from "@siteyonetim/finance-dues";
import { getTranslations } from "next-intl/server";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Props = {
  locale: string;
  summaries: PortalMemberDebtSummaryDto[];
};

function money(value: string, locale: string) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: "TRY",
  }).format(Number(value));
}

export async function PortalMemberDebtSection({ locale, summaries }: Props) {
  if (summaries.length === 0) return null;

  const t = await getTranslations("portal");

  return summaries.map((summary) => (
    <Card key={summary.propertyId} className="border-border/70 shadow-none">
      <CardHeader>
        <CardTitle>{t("memberDebtTitle", { property: summary.propertyName })}</CardTitle>
        <CardDescription>{t("memberDebtSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
          <p className="text-xs text-muted-foreground">{t("memberDebtTotal")}</p>
          <p className="mt-2 text-lg font-semibold">{money(summary.totalDebt, locale)}</p>
        </div>

        {summary.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("memberDebtEmpty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("memberDebtUnit")}</TableHead>
                <TableHead>{t("memberDebtBlock")}</TableHead>
                <TableHead className="text-right">{t("memberDebtAmount")}</TableHead>
                <TableHead className="text-right">{t("memberDebtAging30")}</TableHead>
                <TableHead className="text-right">{t("memberDebtAging60")}</TableHead>
                <TableHead className="text-right">{t("memberDebtAging61")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.rows.map((row) => (
                <TableRow key={row.unitId}>
                  <TableCell className="font-medium">{row.unitCode}</TableCell>
                  <TableCell>{row.blockName ?? "—"}</TableCell>
                  <TableCell className="text-right">{money(row.totalDebt, locale)}</TableCell>
                  <TableCell className="text-right">{money(row.aging0To30, locale)}</TableCell>
                  <TableCell className="text-right">{money(row.aging31To60, locale)}</TableCell>
                  <TableCell className="text-right">{money(row.aging61Plus, locale)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  ));
}
