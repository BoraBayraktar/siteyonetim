"use client";

import type { FinanceCategoryDto } from "@siteyonetim/finance-core";
import type { OperatingBudgetDto } from "@siteyonetim/finance-core";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { saveOperatingBudgetAction, type BudgetActionState } from "@/app/actions/budget";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AmountInput } from "@/components/ui/amount-input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const initial: BudgetActionState = {};

type Props = {
  locale: string;
  propertyId: string;
  year: number;
  categories: FinanceCategoryDto[];
  budget: OperatingBudgetDto | null;
  readOnly?: boolean;
};

function money(value: string, locale: string) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: "TRY",
  }).format(Number(value));
}

export function OperatingBudgetPanel({ locale, propertyId, year, categories, budget, readOnly = false }: Props) {
  const t = useTranslations("reports");
  const [state, action, pending] = useActionState(
    saveOperatingBudgetAction.bind(null, locale, propertyId),
    initial,
  );

  const plannedByCategory = new Map(budget?.lines.map((line) => [line.categoryId, line.plannedAmount]) ?? []);
  const actualByCategory = new Map(budget?.lines.map((line) => [line.categoryId, line.actualAmount]) ?? []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("budgetTitle")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("budgetSubtitle")}</p>
      </CardHeader>
      <CardContent>
        {readOnly ? (
          categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("budgetEmpty")}</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("category")}</TableHead>
                    <TableHead>{t("planned")}</TableHead>
                    <TableHead>{t("actual")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>{category.name}</TableCell>
                      <TableCell>{money(plannedByCategory.get(category.id) ?? "0", locale)}</TableCell>
                      <TableCell>{money(actualByCategory.get(category.id) ?? "0", locale)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        ) : (
          <form action={action} className="space-y-4">
            <input type="hidden" name="year" value={year} />
            <div className="grid gap-2">
              <Label htmlFor="budget-notes">{t("budgetNotes")}</Label>
              <Textarea id="budget-notes" name="notes" defaultValue={budget?.notes ?? ""} rows={2} />
            </div>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("budgetEmpty")}</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("category")}</TableHead>
                      <TableHead>{t("planned")}</TableHead>
                      <TableHead>{t("actual")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell>
                          {category.name}
                          <input type="hidden" name="categoryId" value={category.id} />
                        </TableCell>
                        <TableCell>
                          <AmountInput
                            name="plannedAmount"
                            defaultValue={plannedByCategory.get(category.id) ?? ""}
                            className="w-full min-w-[8rem]"
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {money(actualByCategory.get(category.id) ?? "0", locale)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {state.success ? <p className="text-sm text-primary">{t("budgetSaved")}</p> : null}
            {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
            <Button type="submit" disabled={pending || categories.length === 0}>
              {t("budgetSave")}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
