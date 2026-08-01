import type { PortalIncomeExpenseSummaryDto } from "@siteyonetim/reporting-standard";
import { getTranslations } from "next-intl/server";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Props = {
  locale: string;
  reports: PortalIncomeExpenseSummaryDto[];
};

function money(value: string, locale: string) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: "TRY",
  }).format(Number(value));
}

export async function PortalIncomeExpenseSection({ locale, reports }: Props) {
  if (reports.length === 0) return null;

  const t = await getTranslations("portal");

  return reports.map((report) => (
    <Card key={report.propertyId} className="border-border/70 shadow-none">
      <CardHeader>
        <CardTitle>{t("incomeExpenseTitle", { property: report.propertyName })}</CardTitle>
        <CardDescription>{t("incomeExpenseSubtitle", { year: report.year })}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">{t("incomeExpenseTotalIncome")}</p>
            <p className="mt-2 text-lg font-semibold">{money(report.totalIncome, locale)}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">{t("incomeExpenseTotalExpense")}</p>
            <p className="mt-2 text-lg font-semibold">{money(report.totalExpense, locale)}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">{t("incomeExpenseNetResult")}</p>
            <p className="mt-2 text-lg font-semibold">{money(report.netResult, locale)}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">{t("incomeExpenseDueCollection")}</p>
            <p className="mt-2 text-lg font-semibold">{money(report.dueCollectionTotal, locale)}</p>
          </div>
        </div>

        {report.expenseRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("incomeExpenseEmpty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("incomeExpenseCategory")}</TableHead>
                <TableHead className="text-right">{t("incomeExpenseAmount")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.expenseRows.map((row) => (
                <TableRow key={row.categoryName}>
                  <TableCell>{row.categoryName}</TableCell>
                  <TableCell className="text-right">{money(row.amount, locale)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  ));
}
