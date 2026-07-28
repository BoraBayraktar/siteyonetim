"use client";

import {
  FinanceAccountKind,
  FinanceCategoryType,
  FinancePeriodStatus,
  LedgerEntryType,
} from "@siteyonetim/db";
import type { CashboxDto, FinanceAccountDto, FinanceCategoryDto, FinancePeriodDto, LedgerEntryDto } from "@siteyonetim/finance-core";
import type { PartyDto } from "@siteyonetim/property-parties";
import { useTranslations } from "next-intl";
import { useActionState, useState, useTransition } from "react";

import {
  closePeriodAction,
  createAccountAction,
  createCashboxAction,
  createCategoryAction,
  createLedgerEntryAction,
  type FinanceActionState,
} from "@/app/actions/finance";
import { ServerPagination } from "@/components/server-pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const initial: FinanceActionState = {};

type Props = {
  locale: string;
  propertyId: string;
  period: FinancePeriodDto;
  categories: FinanceCategoryDto[];
  accounts: FinanceAccountDto[];
  cashboxes: CashboxDto[];
  ledger: { items: LedgerEntryDto[]; total: number; page: number; pageSize: number };
  parties: PartyDto[];
};

function money(value: string, locale: string) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: "TRY",
  }).format(Number(value));
}

function FinanceError({ code, t }: { code?: string; t: ReturnType<typeof useTranslations> }) {
  if (!code) return null;
  return <p className="text-sm text-destructive">{t(`errors.${code}` as "errors.AMOUNT_INVALID")}</p>;
}

export function FinanceTabs({
  locale,
  propertyId,
  period,
  categories,
  accounts,
  cashboxes,
  ledger,
  parties,
}: Props) {
  const t = useTranslations("finance");
  const [pendingClose, startClose] = useTransition();

  const [ledgerState, ledgerAction, ledgerPending] = useActionState(
    createLedgerEntryAction.bind(null, locale, propertyId),
    initial,
  );
  const [cashboxState, cashboxAction, cashboxPending] = useActionState(
    createCashboxAction.bind(null, locale, propertyId),
    initial,
  );
  const [accountState, accountAction, accountPending] = useActionState(
    createAccountAction.bind(null, locale, propertyId),
    initial,
  );
  const [categoryState, categoryAction, categoryPending] = useActionState(
    createCategoryAction.bind(null, locale, propertyId),
    initial,
  );

  const [entryType, setEntryType] = useState<LedgerEntryType>(LedgerEntryType.EXPENSE);
  const [categoryId, setCategoryId] = useState("");
  const [cashboxId, setCashboxId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [accountKind, setAccountKind] = useState<FinanceAccountKind>(FinanceAccountKind.SUPPLIER);
  const [partyId, setPartyId] = useState("");
  const [catType, setCatType] = useState<FinanceCategoryType>(FinanceCategoryType.EXPENSE);

  const filteredCategories = categories.filter((c) =>
    entryType === LedgerEntryType.INCOME
      ? c.type === FinanceCategoryType.INCOME
      : c.type === FinanceCategoryType.EXPENSE,
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>{t("period")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {period.month}/{period.year} —{" "}
              {period.status === FinancePeriodStatus.OPEN ? t("periodOpen") : t("periodClosed")}
            </p>
          </div>
          {period.status === FinancePeriodStatus.OPEN ? (
            <Button
              variant="outline"
              size="sm"
              disabled={pendingClose}
              onClick={() =>
                startClose(async () => {
                  await closePeriodAction(locale, propertyId, period.id);
                  window.location.reload();
                })
              }
            >
              {t("closePeriod")}
            </Button>
          ) : null}
        </CardHeader>
      </Card>

      <Tabs defaultValue="ledger">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="ledger">{t("tabLedger")}</TabsTrigger>
          <TabsTrigger value="cashboxes">{t("tabCashboxes")}</TabsTrigger>
          <TabsTrigger value="accounts">{t("tabAccounts")}</TabsTrigger>
          <TabsTrigger value="categories">{t("tabCategories")}</TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("tabLedger")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ledger.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("ledgerEmpty")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("entryType")}</TableHead>
                      <TableHead>{t("amount")}</TableHead>
                      <TableHead>{t("category")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledger.items.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          {row.entryType === LedgerEntryType.INCOME ? t("income") : t("expense")}
                        </TableCell>
                        <TableCell>{money(row.amount, locale)}</TableCell>
                        <TableCell>{row.categoryName}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <ServerPagination
                page={ledger.page}
                pageSize={ledger.pageSize}
                total={ledger.total}
                basePath={`/admin/properties/${propertyId}/finance`}
                locale={locale}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("addEntry")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={ledgerAction} className="grid gap-3">
                <input type="hidden" name="entryType" value={entryType} />
                <input type="hidden" name="categoryId" value={categoryId} />
                <input type="hidden" name="cashboxId" value={cashboxId} />
                <input type="hidden" name="financeAccountId" value={accountId} />
                <div className="grid gap-2">
                  <Label>{t("entryType")}</Label>
                  <Select value={entryType} onValueChange={(v) => setEntryType(v as LedgerEntryType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={LedgerEntryType.INCOME}>{t("income")}</SelectItem>
                      <SelectItem value={LedgerEntryType.EXPENSE}>{t("expense")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>{t("category")}</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("noneSelected")} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="amount">{t("amount")}</Label>
                  <Input id="amount" name="amount" required />
                </div>
                <div className="grid gap-2">
                  <Label>{t("cashbox")}</Label>
                  <Select value={cashboxId} onValueChange={setCashboxId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("optional")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t("noneSelected")}</SelectItem>
                      {cashboxes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>{t("account")}</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("optional")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t("noneSelected")}</SelectItem>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.code} — {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="documentNo">{t("documentNo")}</Label>
                  <Input id="documentNo" name="documentNo" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">{t("description")}</Label>
                  <Input id="description" name="description" />
                </div>
                <FinanceError code={ledgerState.error} t={t} />
                {ledgerState.success ? (
                  <p className="text-sm text-muted-foreground">{t("entrySuccess")}</p>
                ) : null}
                <Button type="submit" disabled={ledgerPending || period.status !== FinancePeriodStatus.OPEN}>
                  {t("addEntry")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cashboxes" className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("tabCashboxes")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {cashboxes.map((c) => (
                  <li key={c.id} className="flex justify-between border-b pb-2">
                    <span>{c.name}</span>
                    <span>{money(c.balance, locale)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("addCashbox")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={cashboxAction} className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="cashbox-name">{t("cashbox")}</Label>
                  <Input id="cashbox-name" name="name" required />
                </div>
                <FinanceError code={cashboxState.error} t={t} />
                {cashboxState.success ? (
                  <p className="text-sm text-muted-foreground">{t("cashboxSuccess")}</p>
                ) : null}
                <Button type="submit" disabled={cashboxPending}>
                  {t("addCashbox")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts" className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("tabAccounts")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("accountCode")}</TableHead>
                    <TableHead>{t("balance")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        {a.code} — {a.name}
                      </TableCell>
                      <TableCell>{money(a.balance, locale)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("addAccount")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={accountAction} className="grid gap-3">
                <input type="hidden" name="kind" value={accountKind} />
                <input type="hidden" name="partyId" value={partyId} />
                <div className="grid gap-2">
                  <Label htmlFor="acc-code">{t("accountCode")}</Label>
                  <Input id="acc-code" name="code" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="acc-name">{t("account")}</Label>
                  <Input id="acc-name" name="name" required />
                </div>
                <div className="grid gap-2">
                  <Label>{t("accountKind")}</Label>
                  <Select value={accountKind} onValueChange={(v) => setAccountKind(v as FinanceAccountKind)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={FinanceAccountKind.PARTY}>{t("kindParty")}</SelectItem>
                      <SelectItem value={FinanceAccountKind.SUPPLIER}>{t("kindSupplier")}</SelectItem>
                      <SelectItem value={FinanceAccountKind.GENERAL}>{t("kindGeneral")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>{t("linkParty")}</Label>
                  <Select value={partyId} onValueChange={setPartyId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("noParty")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t("noParty")}</SelectItem>
                      {parties.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <FinanceError code={accountState.error} t={t} />
                {accountState.success ? (
                  <p className="text-sm text-muted-foreground">{t("accountSuccess")}</p>
                ) : null}
                <Button type="submit" disabled={accountPending}>
                  {t("addAccount")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("tabCategories")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {categories.map((c) => (
                  <li key={c.id} className="border-b pb-2">
                    {c.name}{" "}
                    <span className="text-muted-foreground">
                      ({c.type === FinanceCategoryType.INCOME ? t("income") : t("expense")})
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("addCategory")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={categoryAction} className="grid gap-3">
                <input type="hidden" name="type" value={catType} />
                <div className="grid gap-2">
                  <Label htmlFor="cat-name">{t("category")}</Label>
                  <Input id="cat-name" name="name" required />
                </div>
                <div className="grid gap-2">
                  <Label>{t("categoryType")}</Label>
                  <Select value={catType} onValueChange={(v) => setCatType(v as FinanceCategoryType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={FinanceCategoryType.INCOME}>{t("income")}</SelectItem>
                      <SelectItem value={FinanceCategoryType.EXPENSE}>{t("expense")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <FinanceError code={categoryState.error} t={t} />
                {categoryState.success ? (
                  <p className="text-sm text-muted-foreground">{t("categorySuccess")}</p>
                ) : null}
                <Button type="submit" disabled={categoryPending}>
                  {t("addCategory")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
