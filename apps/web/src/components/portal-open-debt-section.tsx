import { DueAccrualLineKind } from "@siteyonetim/db";
import type { PortalOpenDebtLineDto } from "@siteyonetim/finance-dues";
import { getTranslations } from "next-intl/server";

import { PortalOnlinePaymentButton } from "@/components/portal-online-payment-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Props = {
  locale: string;
  lines: PortalOpenDebtLineDto[];
  showMultipleUnits: boolean;
  openDebt: string;
  onlinePayment?: {
    propertyId: string;
    partyId: string;
    unitId?: string;
  } | null;
};

function money(value: string, locale: string) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: "TRY",
  }).format(Number(value));
}

function formatPeriod(year: number, month: number, locale: string) {
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function unitLabel(line: PortalOpenDebtLineDto) {
  return line.blockName ? `${line.blockName} / ${line.unitCode}` : line.unitCode;
}

function displayPeriod(line: PortalOpenDebtLineDto, locale: string) {
  if (line.lineKind === DueAccrualLineKind.LATE_FEE && line.sourceYear && line.sourceMonth) {
    return formatPeriod(line.sourceYear, line.sourceMonth, locale);
  }
  return formatPeriod(line.year, line.month, locale);
}

function displayDefinition(line: PortalOpenDebtLineDto) {
  if (line.lineKind === DueAccrualLineKind.LATE_FEE && line.sourceDueDefinitionName) {
    return line.sourceDueDefinitionName;
  }
  return line.dueDefinitionName;
}

export async function PortalOpenDebtSection({
  locale,
  lines,
  showMultipleUnits,
  openDebt,
  onlinePayment,
}: Props) {
  const t = await getTranslations("portal");

  return (
    <Card id="portal-open-debt" className="scroll-mt-24 border-border/70 shadow-none">
      <CardHeader>
        <CardTitle>{t("openDebtTitle")}</CardTitle>
        <CardDescription>{t("openDebtSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("openDebtEmpty")}</p>
        ) : (
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("openDebtPeriod")}</TableHead>
                  <TableHead>{t("openDebtDefinition")}</TableHead>
                  <TableHead>{t("openDebtType")}</TableHead>
                  {showMultipleUnits ? <TableHead>{t("unitCode")}</TableHead> : null}
                  <TableHead className="text-right">{t("openDebtRemaining")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium">{displayPeriod(line, locale)}</TableCell>
                    <TableCell>{displayDefinition(line)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          line.lineKind === DueAccrualLineKind.LATE_FEE
                            ? "warning"
                            : line.lineKind === DueAccrualLineKind.SUPPLIER_LATE_FEE
                              ? "secondary"
                              : "info"
                        }
                      >
                        {line.lineKind === DueAccrualLineKind.LATE_FEE
                          ? t("openDebtKindLateFee")
                          : line.lineKind === DueAccrualLineKind.SUPPLIER_LATE_FEE
                            ? t("openDebtKindSupplierLateFee")
                            : t("openDebtKindDue")}
                      </Badge>
                      {line.lineKind === DueAccrualLineKind.LATE_FEE ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t("openDebtKindLateFee")} — {t("openDebtPeriod")}:{" "}
                          {formatPeriod(line.year, line.month, locale)}
                        </p>
                      ) : null}
                      {line.lineKind === DueAccrualLineKind.SUPPLIER_LATE_FEE &&
                      line.supplierLateFeeAllocationMode ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t(`supplierLateFeeAllocationMode.${line.supplierLateFeeAllocationMode}`)}
                          {line.supplierReference ? ` · ${line.supplierReference}` : ""}
                        </p>
                      ) : null}
                    </TableCell>
                    {showMultipleUnits ? <TableCell>{unitLabel(line)}</TableCell> : null}
                    <TableCell className="text-right font-semibold">{money(line.remaining, locale)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
        {onlinePayment ? (
          <PortalOnlinePaymentButton
            locale={locale}
            propertyId={onlinePayment.propertyId}
            partyId={onlinePayment.partyId}
            unitId={onlinePayment.unitId}
            openDebt={openDebt}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
