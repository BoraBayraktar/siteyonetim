"use client";

import { IncidentCategory, IncidentPriority, IncidentStatus } from "@siteyonetim/db";
import type { CashboxDto, FinanceCategoryDto } from "@siteyonetim/finance-core";
import type { IncidentDto } from "@siteyonetim/itsm-incidents";
import type { UnitDto } from "@siteyonetim/property-core";
import { useTranslations } from "next-intl";
import { useActionState, useState, useTransition } from "react";

import {
  closeIncidentWithExpenseAction,
  createIncidentAction,
  updateIncidentStatusAction,
  type IncidentActionState,
} from "@/app/actions/incidents";
import { FormDrawer } from "@/components/form-drawer";
import { ServerPagination } from "@/components/server-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AmountInput } from "@/components/ui/amount-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  locale: string;
  propertyId: string;
  items: IncidentDto[];
  page: number;
  pageSize: number;
  total: number;
  units: UnitDto[];
  canCreate?: boolean;
  managerMode?: boolean;
  expenseCategories?: FinanceCategoryDto[];
  cashboxes?: CashboxDto[];
  listBasePath: string;
};

const initial: IncidentActionState = {};
const NO_UNIT = "__none__";
const NO_CASHBOX = "__none__";

function money(value: string, locale: string) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: "TRY",
  }).format(Number(value));
}

function statusVariant(status: IncidentStatus): "default" | "secondary" | "outline" {
  if (status === IncidentStatus.OPEN) return "default";
  if (status === IncidentStatus.IN_PROGRESS) return "secondary";
  return "outline";
}

function priorityVariant(priority: IncidentPriority): "default" | "secondary" | "destructive" | "outline" {
  if (priority === IncidentPriority.URGENT) return "destructive";
  if (priority === IncidentPriority.HIGH) return "default";
  return "outline";
}

function CloseIncidentWithExpenseDrawer({
  locale,
  propertyId,
  item,
  expenseCategories,
  cashboxes,
  t,
  tFinance,
}: {
  locale: string;
  propertyId: string;
  item: IncidentDto;
  expenseCategories: FinanceCategoryDto[];
  cashboxes: CashboxDto[];
  t: ReturnType<typeof useTranslations>;
  tFinance: ReturnType<typeof useTranslations>;
}) {
  const [state, action, pending] = useActionState(
    closeIncidentWithExpenseAction.bind(null, locale, propertyId, item.id),
    initial,
  );
  const [categoryId, setCategoryId] = useState(expenseCategories[0]?.id ?? "");
  const [cashboxId, setCashboxId] = useState(NO_CASHBOX);

  function resolveError(code?: string) {
    if (!code) return null;
    if (code.startsWith("INCIDENT_") || code === "UNAUTHORIZED" || code === "PROPERTY_NOT_FOUND") {
      return t(`errors.${code}`, { defaultMessage: code });
    }
    return tFinance(`errors.${code}`, { defaultMessage: code });
  }

  return (
    <FormDrawer
      triggerLabel={t("closeWithExpense")}
      title={t("closeWithExpenseTitle")}
      helpTopicKey="incidents"
      success={state.success}
    >
      <form action={action} className="grid gap-3">
        <input type="hidden" name="categoryId" value={categoryId} />
        <input type="hidden" name="cashboxId" value={cashboxId === NO_CASHBOX ? "" : cashboxId} />
        <p className="text-sm text-muted-foreground">{item.title}</p>
        <div className="grid gap-2">
          <Label>{tFinance("category")}</Label>
          <Select value={categoryId} onValueChange={setCategoryId} required>
            <SelectTrigger>
              <SelectValue placeholder={tFinance("noneSelected")} />
            </SelectTrigger>
            <SelectContent>
              {expenseCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`expense-amount-${item.id}`}>{tFinance("amount")}</Label>
          <AmountInput id={`expense-amount-${item.id}`} name="amount" required />
        </div>
        <div className="grid gap-2">
          <Label>{tFinance("cashbox")}</Label>
          <Select value={cashboxId} onValueChange={setCashboxId}>
            <SelectTrigger>
              <SelectValue placeholder={tFinance("optional")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_CASHBOX}>{tFinance("noneSelected")}</SelectItem>
              {cashboxes.map((cashbox) => (
                <SelectItem key={cashbox.id} value={cashbox.id}>
                  {cashbox.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`expense-document-${item.id}`}>{tFinance("documentNo")}</Label>
          <Input id={`expense-document-${item.id}`} name="documentNo" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`expense-description-${item.id}`}>{tFinance("description")}</Label>
          <Input
            id={`expense-description-${item.id}`}
            name="description"
            placeholder={t("closeWithExpenseDescriptionPlaceholder")}
          />
        </div>
        {state.error ? (
          <p className="text-sm text-destructive">{resolveError(state.error)}</p>
        ) : null}
        <Button type="submit" disabled={pending || !categoryId} className="w-full sm:w-auto">
          {t("closeWithExpenseSubmit")}
        </Button>
      </form>
    </FormDrawer>
  );
}

function IncidentStatusActions({
  locale,
  propertyId,
  item,
  managerMode,
  expenseCategories,
  cashboxes,
  t,
  tFinance,
}: {
  locale: string;
  propertyId: string;
  item: IncidentDto;
  managerMode: boolean;
  expenseCategories: FinanceCategoryDto[];
  cashboxes: CashboxDto[];
  t: ReturnType<typeof useTranslations>;
  tFinance: ReturnType<typeof useTranslations>;
}) {
  const [pending, startTransition] = useTransition();

  function setStatus(status: IncidentStatus) {
    startTransition(async () => {
      await updateIncidentStatusAction(locale, propertyId, item.id, status);
    });
  }

  if (item.status === IncidentStatus.CLOSED && !managerMode) {
    return null;
  }

  if (managerMode) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={item.status}
          disabled={pending}
          onValueChange={(value) => setStatus(value as IncidentStatus)}
        >
          <SelectTrigger className="h-8 w-[10rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(IncidentStatus).map((status) => (
              <SelectItem key={status} value={status}>
                {t(`status.${status}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {item.status !== IncidentStatus.CLOSED && expenseCategories.length > 0 ? (
          <CloseIncidentWithExpenseDrawer
            locale={locale}
            propertyId={propertyId}
            item={item}
            expenseCategories={expenseCategories}
            cashboxes={cashboxes}
            t={t}
            tFinance={tFinance}
          />
        ) : null}
      </div>
    );
  }

  if (item.status === IncidentStatus.OPEN) {
    return (
      <Button type="button" size="sm" disabled={pending} onClick={() => setStatus(IncidentStatus.IN_PROGRESS)}>
        {t("actionStart")}
      </Button>
    );
  }

  if (item.status === IncidentStatus.IN_PROGRESS) {
    return (
      <Button type="button" size="sm" disabled={pending} onClick={() => setStatus(IncidentStatus.CLOSED)}>
        {t("actionClose")}
      </Button>
    );
  }

  return null;
}

export function IncidentsPanel({
  locale,
  propertyId,
  items,
  page,
  pageSize,
  total,
  units,
  canCreate = true,
  managerMode = false,
  expenseCategories = [],
  cashboxes = [],
  listBasePath,
}: Props) {
  const t = useTranslations("incidents");
  const tFinance = useTranslations("finance");
  const [state, action, pending] = useActionState(
    createIncidentAction.bind(null, locale, propertyId),
    initial,
  );
  const [category, setCategory] = useState<IncidentCategory>(IncidentCategory.OTHER);
  const [priority, setPriority] = useState<IncidentPriority>(IncidentPriority.NORMAL);
  const [unitId, setUnitId] = useState(NO_UNIT);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>{t("title")}</CardTitle>
        {canCreate ? (
          <FormDrawer triggerLabel={t("createTitle")} title={t("createTitle")} helpTopicKey="incidents" success={state.success}>
            <form action={action} className="grid gap-4">
              <input type="hidden" name="category" value={category} />
              <input type="hidden" name="priority" value={priority} />
              <input type="hidden" name="unitId" value={unitId === NO_UNIT ? "" : unitId} />
              <div className="grid gap-2">
                <Label htmlFor="incident-title">{t("fieldTitle")}</Label>
                <Input id="incident-title" name="title" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="incident-description">{t("fieldDescription")}</Label>
                <Textarea id="incident-description" name="description" rows={4} required />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>{t("fieldCategory")}</Label>
                  <Select value={category} onValueChange={(value) => setCategory(value as IncidentCategory)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(IncidentCategory).map((value) => (
                        <SelectItem key={value} value={value}>
                          {t(`category.${value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>{t("fieldPriority")}</Label>
                  <Select value={priority} onValueChange={(value) => setPriority(value as IncidentPriority)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(IncidentPriority).map((value) => (
                        <SelectItem key={value} value={value}>
                          {t(`priority.${value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>{t("fieldUnit")}</Label>
                <Select value={unitId} onValueChange={setUnitId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("fieldUnitOptional")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_UNIT}>{t("noUnit")}</SelectItem>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.code}
                        {unit.blockName ? ` (${unit.blockName})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {state.error ? (
                <p className="text-sm text-destructive">{t(`errors.${state.error}`, { defaultMessage: state.error })}</p>
              ) : null}
              <Button type="submit" disabled={pending} className="w-full sm:w-auto">
                {t("submitCreate")}
              </Button>
            </form>
          </FormDrawer>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id} className="rounded-lg border p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant(item.status)}>{t(`status.${item.status}`)}</Badge>
                  <Badge variant={priorityVariant(item.priority)}>{t(`priority.${item.priority}`)}</Badge>
                  <Badge variant="outline">{t(`category.${item.category}`)}</Badge>
                  {item.unitCode ? (
                    <span className="text-xs text-muted-foreground">{item.unitCode}</span>
                  ) : null}
                </div>
                <h3 className="font-medium">{item.title}</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{item.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("reportedBy", { name: item.reportedByName })}
                </p>
                {item.linkedExpense ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("linkedExpense", {
                      amount: money(item.linkedExpense.amount, locale),
                      category: item.linkedExpense.categoryName,
                    })}
                  </p>
                ) : null}
                <div className="mt-3">
                  <IncidentStatusActions
                    locale={locale}
                    propertyId={propertyId}
                    item={item}
                    managerMode={managerMode}
                    expenseCategories={expenseCategories}
                    cashboxes={cashboxes}
                    t={t}
                    tFinance={tFinance}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        <ServerPagination
          page={page}
          pageSize={pageSize}
          total={total}
          basePath={listBasePath}
          locale={locale}
        />
      </CardContent>
    </Card>
  );
}
