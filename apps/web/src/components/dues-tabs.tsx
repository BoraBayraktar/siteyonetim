"use client";

import { DueAccrualStatus, DueCalculationMode } from "@siteyonetim/db";
import type { CashboxDto } from "@siteyonetim/finance-core";
import type {
  DebtRowDto,
  DueAccrualLineDto,
  DueAccrualRunDto,
  DueDefinitionDto,
} from "@siteyonetim/finance-dues";
import type { PartyDto } from "@siteyonetim/property-parties";
import { useTranslations } from "next-intl";
import { useActionState, useState, useTransition } from "react";

import {
  createDueDefinitionAction,
  generateAccrualAction,
  postAccrualAction,
  recordDuePaymentAction,
  type DuesActionState,
} from "@/app/actions/dues";
import { ServerPagination } from "@/components/server-pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const initial: DuesActionState = {};

type Props = {
  locale: string;
  propertyId: string;
  definitions: DueDefinitionDto[];
  runs: DueAccrualRunDto[];
  openLines: { items: DueAccrualLineDto[]; total: number; page: number; pageSize: number };
  debtRows: DebtRowDto[];
  cashboxes: CashboxDto[];
  parties: PartyDto[];
};

function money(value: string, locale: string) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: "TRY",
  }).format(Number(value));
}

function DuesError({ code, t }: { code?: string; t: ReturnType<typeof useTranslations> }) {
  if (!code) return null;
  return <p className="text-sm text-destructive">{t(`errors.${code}` as "errors.AMOUNT_INVALID")}</p>;
}

export function DuesTabs({
  locale,
  propertyId,
  definitions,
  runs,
  openLines,
  debtRows,
  cashboxes,
  parties,
}: Props) {
  const t = useTranslations("dues");
  const now = new Date();
  const [pendingPost, startPost] = useTransition();

  const [defState, defAction, defPending] = useActionState(
    createDueDefinitionAction.bind(null, locale, propertyId),
    initial,
  );
  const [genState, genAction, genPending] = useActionState(
    generateAccrualAction.bind(null, locale, propertyId),
    initial,
  );
  const [payState, payAction, payPending] = useActionState(
    recordDuePaymentAction.bind(null, locale, propertyId),
    initial,
  );

  const [mode, setMode] = useState<DueCalculationMode>(DueCalculationMode.FIXED);
  const [definitionId, setDefinitionId] = useState(definitions[0]?.id ?? "");
  const [cashboxId, setCashboxId] = useState(cashboxes[0]?.id ?? "");
  const [partyId, setPartyId] = useState(parties[0]?.id ?? "");

  return (
    <Tabs defaultValue="accrual">
      <TabsList className="flex h-auto flex-wrap gap-1">
        <TabsTrigger value="accrual">{t("tabAccrual")}</TabsTrigger>
        <TabsTrigger value="payment">{t("tabPayment")}</TabsTrigger>
        <TabsTrigger value="debt">{t("tabDebt")}</TabsTrigger>
        <TabsTrigger value="definitions">{t("tabDefinitions")}</TabsTrigger>
      </TabsList>

      <TabsContent value="definitions" className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("definitionsList")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {definitions.map((d) => (
              <div key={d.id} className="border-b pb-2">
                <p className="font-medium">{d.name}</p>
                <p className="text-muted-foreground">
                  {d.calculationMode === DueCalculationMode.FIXED
                    ? `${t("fixed")}: ${d.fixedAmount}`
                    : `${t("area")}: ${d.ratePerM2} / m²`}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("addDefinition")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={defAction} className="grid gap-3">
              <input type="hidden" name="calculationMode" value={mode} />
              <div className="grid gap-2">
                <Label htmlFor="def-name">{t("definitionName")}</Label>
                <Input id="def-name" name="name" required />
              </div>
              <div className="grid gap-2">
                <Label>{t("calculationMode")}</Label>
                <Select value={mode} onValueChange={(v) => setMode(v as DueCalculationMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DueCalculationMode.FIXED}>{t("fixed")}</SelectItem>
                    <SelectItem value={DueCalculationMode.AREA_M2}>{t("area")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {mode === DueCalculationMode.FIXED ? (
                <div className="grid gap-2">
                  <Label htmlFor="fixed-amount">{t("fixedAmount")}</Label>
                  <Input id="fixed-amount" name="fixedAmount" required />
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor="rate">{t("ratePerM2")}</Label>
                  <Input id="rate" name="ratePerM2" required />
                </div>
              )}
              <DuesError code={defState.error} t={t} />
              {defState.success ? <p className="text-sm text-muted-foreground">{t("definitionSuccess")}</p> : null}
              <Button type="submit" disabled={defPending}>
                {t("addDefinition")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="accrual" className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("accrualRuns")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {runs.map((run) => (
              <div key={run.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 text-sm">
                <div>
                  <p className="font-medium">
                    {run.dueDefinitionName} — {run.month}/{run.year}
                  </p>
                  <p className="text-muted-foreground">
                    {money(run.totalAmount, locale)} · {run.lineCount} {t("lines")}
                  </p>
                </div>
                {run.status === DueAccrualStatus.DRAFT ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pendingPost}
                    onClick={() =>
                      startPost(async () => {
                        await postAccrualAction(locale, propertyId, run.id);
                        window.location.reload();
                      })
                    }
                  >
                    {t("postAccrual")}
                  </Button>
                ) : (
                  <span className="text-muted-foreground">{t("posted")}</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("generateAccrual")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={genAction} className="grid gap-3">
              <input type="hidden" name="dueDefinitionId" value={definitionId} />
              <div className="grid gap-2">
                <Label>{t("definitionName")}</Label>
                <Select value={definitionId} onValueChange={setDefinitionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="…" />
                  </SelectTrigger>
                  <SelectContent>
                    {definitions.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="year">{t("year")}</Label>
                  <Input id="year" name="year" type="number" defaultValue={now.getFullYear()} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="month">{t("month")}</Label>
                  <Input id="month" name="month" type="number" min={1} max={12} defaultValue={now.getMonth() + 1} required />
                </div>
              </div>
              <DuesError code={genState.error} t={t} />
              {genState.success ? <p className="text-sm text-muted-foreground">{t("accrualGenerated")}</p> : null}
              <Button type="submit" disabled={genPending || definitions.length === 0}>
                {t("generateAccrual")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="payment" className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("openLines")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("unit")}</TableHead>
                  <TableHead>{t("remaining")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openLines.items.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      {line.unitCode} ({line.month}/{line.year})
                    </TableCell>
                    <TableCell>{money(line.remaining, locale)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ServerPagination
              page={openLines.page}
              pageSize={openLines.pageSize}
              total={openLines.total}
              basePath={`/admin/properties/${propertyId}/dues`}
              locale={locale}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("recordPayment")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={payAction} className="grid gap-3">
              <input type="hidden" name="cashboxId" value={cashboxId} />
              <input type="hidden" name="partyId" value={partyId} />
              <div className="grid gap-2">
                <Label>{t("party")}</Label>
                <Select value={partyId} onValueChange={setPartyId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {parties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t("cashbox")}</Label>
                <Select value={cashboxId} onValueChange={setCashboxId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cashboxes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pay-amount">{t("amount")}</Label>
                <Input id="pay-amount" name="amount" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pay-doc">{t("documentNo")}</Label>
                <Input id="pay-doc" name="documentNo" />
              </div>
              <p className="text-xs text-muted-foreground">{t("autoAllocateHint")}</p>
              <DuesError code={payState.error} t={t} />
              {payState.success ? <p className="text-sm text-muted-foreground">{t("paymentSuccess")}</p> : null}
              <Button type="submit" disabled={payPending || cashboxes.length === 0 || parties.length === 0}>
                {t("recordPayment")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="debt">
        <Card>
          <CardHeader>
            <CardTitle>{t("tabDebt")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("unit")}</TableHead>
                  <TableHead>{t("party")}</TableHead>
                  <TableHead>{t("totalDebt")}</TableHead>
                  <TableHead>0-30</TableHead>
                  <TableHead>31-60</TableHead>
                  <TableHead>61+</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debtRows.map((row) => (
                  <TableRow key={row.unitId}>
                    <TableCell>{row.unitCode}</TableCell>
                    <TableCell>{row.partyName ?? "—"}</TableCell>
                    <TableCell>{money(row.totalDebt, locale)}</TableCell>
                    <TableCell>{money(row.aging0To30, locale)}</TableCell>
                    <TableCell>{money(row.aging31To60, locale)}</TableCell>
                    <TableCell>{money(row.aging61Plus, locale)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
