"use client";

import {
  FinanceAccountKind,
  FinanceCategoryType,
  FinancePeriodStatus,
  LedgerEntryType,
} from "@siteyonetim/db";
import type {
  CashboxDto,
  FinanceAccountDto,
  FinanceCategoryDto,
  FinancePeriodDto,
  LedgerEntryDto,
} from "@siteyonetim/finance-core";
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
import { FormDrawer } from "@/components/form-drawer";
import { PartyCombobox } from "@/components/party-combobox";
import { ServerPagination } from "@/components/server-pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { FinancePanelTab } from "@/lib/finance-tab";

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
  activePanel?: FinancePanelTab;
  showPeriodCard?: boolean;
  duesTab?: string;
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

function PeriodCard({
  locale,
  propertyId,
  period,
  t,
}: {
  locale: string;
  propertyId: string;
  period: FinancePeriodDto;
  t: ReturnType<typeof useTranslations>;
}) {
  const [pendingClose, startClose] = useTransition();

  return (
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
  );
}

function LedgerPanel({
  locale,
  propertyId,
  period,
  categories,
  accounts,
  cashboxes,
  ledger,
  duesTab,
  t,
}: {
  locale: string;
  propertyId: string;
  period: FinancePeriodDto;
  categories: FinanceCategoryDto[];
  accounts: FinanceAccountDto[];
  cashboxes: CashboxDto[];
  ledger: Props["ledger"];
  duesTab: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const [ledgerState, ledgerAction, ledgerPending] = useActionState(
    createLedgerEntryAction.bind(null, locale, propertyId),
    initial,
  );
  const [entryType, setEntryType] = useState<LedgerEntryType>(LedgerEntryType.EXPENSE);
  const [categoryId, setCategoryId] = useState("");
  const [cashboxId, setCashboxId] = useState("");
  const [accountId, setAccountId] = useState("");

  const filteredCategories = categories.filter((c) =>
    entryType === LedgerEntryType.INCOME
      ? c.type === FinanceCategoryType.INCOME
      : c.type === FinanceCategoryType.EXPENSE,
  );

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>{t("tabLedger")}</CardTitle>
        <FormDrawer
          triggerLabel={t("addEntry")}
          title={t("addEntry")}
          success={ledgerState.success}
          disabled={period.status !== FinancePeriodStatus.OPEN}
        >
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
            <Button type="submit" disabled={ledgerPending || period.status !== FinancePeriodStatus.OPEN} className="w-full sm:w-auto">
              {t("addEntry")}
            </Button>
          </form>
        </FormDrawer>
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
          basePath={`/admin/properties/${propertyId}/dues`}
          locale={locale}
          extraSearchParams={{ tab: duesTab }}
        />
      </CardContent>
    </Card>
  );
}

function CashboxesPanel({
  locale,
  propertyId,
  cashboxes,
  t,
}: {
  locale: string;
  propertyId: string;
  cashboxes: CashboxDto[];
  t: ReturnType<typeof useTranslations>;
}) {
  const [cashboxState, cashboxAction, cashboxPending] = useActionState(
    createCashboxAction.bind(null, locale, propertyId),
    initial,
  );

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>{t("tabCashboxes")}</CardTitle>
        <FormDrawer triggerLabel={t("addCashbox")} title={t("addCashbox")} success={cashboxState.success}>
          <form action={cashboxAction} className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="cashbox-name">{t("cashbox")}</Label>
              <Input id="cashbox-name" name="name" required />
            </div>
            <FinanceError code={cashboxState.error} t={t} />
            <Button type="submit" disabled={cashboxPending} className="w-full sm:w-auto">
              {t("addCashbox")}
            </Button>
          </form>
        </FormDrawer>
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
  );
}

function AccountsPanel({
  locale,
  propertyId,
  accounts,
  parties,
  t,
}: {
  locale: string;
  propertyId: string;
  accounts: FinanceAccountDto[];
  parties: PartyDto[];
  t: ReturnType<typeof useTranslations>;
}) {
  const [accountState, accountAction, accountPending] = useActionState(
    createAccountAction.bind(null, locale, propertyId),
    initial,
  );
  const [accountKind, setAccountKind] = useState<FinanceAccountKind>(FinanceAccountKind.SUPPLIER);
  const [partyId, setPartyId] = useState("");

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>{t("tabAccounts")}</CardTitle>
        <FormDrawer triggerLabel={t("addAccount")} title={t("addAccount")} success={accountState.success}>
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
              <PartyCombobox
                parties={parties.map((p) => ({ id: p.id, displayName: p.displayName }))}
                value={partyId}
                onValueChange={setPartyId}
                placeholder={t("noParty")}
                allowEmpty
                emptyValueLabel={t("noParty")}
              />
            </div>
            <FinanceError code={accountState.error} t={t} />
            <Button type="submit" disabled={accountPending} className="w-full sm:w-auto">
              {t("addAccount")}
            </Button>
          </form>
        </FormDrawer>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
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
        </div>
      </CardContent>
    </Card>
  );
}

function CategoriesPanel({
  locale,
  propertyId,
  categories,
  t,
}: {
  locale: string;
  propertyId: string;
  categories: FinanceCategoryDto[];
  t: ReturnType<typeof useTranslations>;
}) {
  const [categoryState, categoryAction, categoryPending] = useActionState(
    createCategoryAction.bind(null, locale, propertyId),
    initial,
  );
  const [catType, setCatType] = useState<FinanceCategoryType>(FinanceCategoryType.EXPENSE);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>{t("tabCategories")}</CardTitle>
        <FormDrawer triggerLabel={t("addCategory")} title={t("addCategory")} success={categoryState.success}>
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
            <Button type="submit" disabled={categoryPending} className="w-full sm:w-auto">
              {t("addCategory")}
            </Button>
          </form>
        </FormDrawer>
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
  );
}

function FinancePanelContent({
  panel,
  locale,
  propertyId,
  period,
  categories,
  accounts,
  cashboxes,
  ledger,
  parties,
  duesTab,
  t,
}: {
  panel: FinancePanelTab;
  locale: string;
  propertyId: string;
  period: FinancePeriodDto;
  categories: FinanceCategoryDto[];
  accounts: FinanceAccountDto[];
  cashboxes: CashboxDto[];
  ledger: Props["ledger"];
  parties: PartyDto[];
  duesTab: string;
  t: ReturnType<typeof useTranslations>;
}) {
  switch (panel) {
    case "ledger":
      return (
        <LedgerPanel
          locale={locale}
          propertyId={propertyId}
          period={period}
          categories={categories}
          accounts={accounts}
          cashboxes={cashboxes}
          ledger={ledger}
          duesTab={duesTab ?? "expenses"}
          t={t}
        />
      );
    case "cashboxes":
      return <CashboxesPanel locale={locale} propertyId={propertyId} cashboxes={cashboxes} t={t} />;
    case "accounts":
      return (
        <AccountsPanel
          locale={locale}
          propertyId={propertyId}
          accounts={accounts}
          parties={parties}
          t={t}
        />
      );
    case "categories":
      return (
        <CategoriesPanel locale={locale} propertyId={propertyId} categories={categories} t={t} />
      );
    default:
      return null;
  }
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
  activePanel = "ledger",
  showPeriodCard = true,
  duesTab = "expenses",
}: Props) {
  const t = useTranslations("finance");
  const panelProps = {
    locale,
    propertyId,
    period,
    categories,
    accounts,
    cashboxes,
    ledger,
    parties,
    duesTab,
    t,
  };

  return (
    <div className="space-y-6">
      {showPeriodCard ? <PeriodCard locale={locale} propertyId={propertyId} period={period} t={t} /> : null}
      <FinancePanelContent panel={activePanel} {...panelProps} />
    </div>
  );
}
