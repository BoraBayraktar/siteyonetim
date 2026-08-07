import { OccupancyRole } from "@siteyonetim/db";
import type { AnnouncementDto } from "@siteyonetim/comm-announcements";
import type { DocumentDto } from "@siteyonetim/document-management";
import type { PortalMemberDebtSummaryDto, PortalOpenDebtLineDto, StatementLineDto } from "@siteyonetim/finance-dues";
import type { IncidentDto } from "@siteyonetim/itsm-incidents";
import type { PortalOccupancyDto } from "@siteyonetim/property-occupancy";
import type { PortalIncomeExpenseSummaryDto } from "@siteyonetim/reporting-standard";
import { Building2, FileText, Megaphone, Receipt, Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PortalAnnouncementsList } from "@/components/portal-announcements-list";
import { PortalDocumentsList } from "@/components/portal-documents-list";
import { PortalIncidentsSection } from "@/components/portal-incidents-section";
import { PortalIncomeExpenseSection } from "@/components/portal-income-expense-section";
import { PortalMemberDebtSection } from "@/components/portal-member-debt-section";
import { PortalOpenDebtSection } from "@/components/portal-open-debt-section";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type PortalSettingsFlags = {
  showStatement: boolean;
  showAnnouncements: boolean;
  showDocuments: boolean;
  showIncidents: boolean;
};

type Props = {
  locale: string;
  userName: string;
  openDebt: string;
  openDebtLines: PortalOpenDebtLineDto[];
  units: PortalOccupancyDto[];
  statement: StatementLineDto[];
  announcements: AnnouncementDto[];
  documents: DocumentDto[];
  incidents: IncidentDto[];
  propertyNames: Record<string, string>;
  incomeExpenseReports: PortalIncomeExpenseSummaryDto[];
  memberDebtSummaries: PortalMemberDebtSummaryDto[];
  primarySettings: PortalSettingsFlags | null;
  showIncidentsSection: boolean;
  fixedPropertyId?: string;
  fixedUnitId?: string;
};

function money(value: string, locale: string) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: "TRY",
  }).format(Number(value));
}

function formatDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export async function PortalDashboard({
  locale,
  userName,
  openDebt,
  openDebtLines,
  units,
  statement,
  announcements,
  documents,
  incidents,
  propertyNames,
  incomeExpenseReports,
  memberDebtSummaries,
  primarySettings,
  showIncidentsSection,
  fixedPropertyId,
  fixedUnitId,
}: Props) {
  const t = await getTranslations("portal");
  const unreadAnnouncements = announcements.filter((item) => !item.readByUser).length;
  const showMultipleUnits =
    new Set(openDebtLines.map((line) => line.unitCode)).size > 1 || units.length > 1;

  const kpis = [
    {
      key: "debt",
      label: t("openDebt"),
      value: money(openDebt, locale),
      hint: t("kpiOpenDebtHint"),
      icon: Wallet,
      tone: "primary" as const,
    },
    {
      key: "units",
      label: t("unitCode"),
      value: String(units.length),
      hint: t("kpiUnitsHint"),
      icon: Building2,
      tone: "info" as const,
    },
    {
      key: "announcements",
      label: t("announcementsTitle"),
      value: String(announcements.length),
      hint: t("kpiAnnouncementsHint", { unread: unreadAnnouncements }),
      icon: Megaphone,
      tone: "warning" as const,
    },
    {
      key: "documents",
      label: t("documentsTitle"),
      value: String(documents.length),
      hint: t("kpiDocumentsHint"),
      icon: FileText,
      tone: "success" as const,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-6 md:py-10">
      <section className="overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-card to-card p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <Badge variant="info" className="rounded-full font-normal">
              {t("dashboardBadge")}
            </Badge>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {t("welcome")}, {userName}
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">{t("subtitle")}</p>
          </div>
          <a
            href="#portal-open-debt"
            className="rounded-xl border bg-background/80 px-4 py-3 backdrop-blur-sm transition-colors hover:border-primary/30 hover:bg-background"
          >
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("openDebt")}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{money(openDebt, locale)}</p>
            <p className="mt-1 text-xs text-primary">{t("openDebtViewDetails")}</p>
          </a>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const card = (
            <Card
              className={cn(
                "border-border/70 shadow-none",
                kpi.key === "debt" && "transition-colors hover:border-primary/30",
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
                <div
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg",
                    kpi.tone === "primary" && "bg-primary/10 text-primary",
                    kpi.tone === "info" && "bg-info-muted text-info-muted-foreground",
                    kpi.tone === "warning" && "bg-warning-muted text-warning-muted-foreground",
                    kpi.tone === "success" && "bg-success-muted text-success-muted-foreground",
                  )}
                >
                  <kpi.icon className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tracking-tight">{kpi.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{kpi.hint}</p>
                {kpi.key === "debt" ? (
                  <p className="mt-2 text-xs font-medium text-primary">{t("openDebtViewDetails")}</p>
                ) : null}
              </CardContent>
            </Card>
          );

          if (kpi.key === "debt") {
            return (
              <a key={kpi.key} href="#portal-open-debt" className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {card}
              </a>
            );
          }

          return (
            <div key={kpi.key}>
              {card}
            </div>
          );
        })}
      </section>

      <PortalOpenDebtSection
        locale={locale}
        lines={openDebtLines}
        showMultipleUnits={showMultipleUnits}
      />

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/70 shadow-none">
          <CardHeader>
            <CardTitle>{t("announcementsTitle")}</CardTitle>
            <CardDescription>{t("announcementsSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            {primarySettings?.showAnnouncements === false ? (
              <p className="text-sm text-muted-foreground">{t("sectionHidden")}</p>
            ) : (
              <PortalAnnouncementsList locale={locale} items={announcements} />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-none">
          <CardHeader>
            <CardTitle>{t("documentsTitle")}</CardTitle>
            <CardDescription>{t("documentsSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            {primarySettings?.showDocuments === false ? (
              <p className="text-sm text-muted-foreground">{t("sectionHidden")}</p>
            ) : (
              <PortalDocumentsList items={documents} />
            )}
          </CardContent>
        </Card>
      </section>

      {showIncidentsSection ? (
        <PortalIncidentsSection
          locale={locale}
          items={incidents}
          units={units}
          propertyNames={propertyNames}
          canCreate={showIncidentsSection}
          fixedPropertyId={fixedPropertyId}
          fixedUnitId={fixedUnitId}
        />
      ) : null}

      <PortalIncomeExpenseSection locale={locale} reports={incomeExpenseReports} />
      <PortalMemberDebtSection locale={locale} summaries={memberDebtSummaries} />

      <section className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <Card className="border-border/70 shadow-none">
          <CardHeader>
            <CardTitle>{t("unitsTitle")}</CardTitle>
            <CardDescription>{t("unitsSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            {units.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("emptyUnits")}</p>
            ) : (
              <div className="grid gap-3">
                {units.map((row) => (
                  <div
                    key={row.occupancyId}
                    className="flex items-start justify-between gap-3 rounded-xl border bg-muted/20 p-4"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium">{row.propertyName}</p>
                      <p className="text-sm text-muted-foreground">
                        {row.blockName ? `${row.blockName} / ${row.unitCode}` : row.unitCode}
                      </p>
                    </div>
                    <Badge variant={row.role === OccupancyRole.OWNER ? "info" : "secondary"}>
                      {row.role === OccupancyRole.OWNER ? t("roleOwner") : t("roleTenant")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="size-4 text-muted-foreground" />
              {t("statementTitle")}
            </CardTitle>
            <CardDescription>{t("statementSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            {primarySettings?.showStatement === false ? (
              <p className="text-sm text-muted-foreground">{t("sectionHidden")}</p>
            ) : statement.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("statementEmpty")}</p>
            ) : (
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("statementDate")}</TableHead>
                      <TableHead>{t("statementLabel")}</TableHead>
                      <TableHead>{t("statementDebit")}</TableHead>
                      <TableHead>{t("statementCredit")}</TableHead>
                      <TableHead>{t("statementBalance")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statement.map((row, index) => (
                      <TableRow key={`${row.kind}-${index}`}>
                        <TableCell>{formatDate(row.date, locale)}</TableCell>
                        <TableCell>{row.label}</TableCell>
                        <TableCell>{row.debit !== "0" ? money(row.debit, locale) : "—"}</TableCell>
                        <TableCell>{row.credit !== "0" ? money(row.credit, locale) : "—"}</TableCell>
                        <TableCell className="font-medium">{money(row.balance, locale)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
