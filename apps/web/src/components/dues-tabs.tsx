"use client";

import type { CashboxDto, FinanceAccountDto, FinanceCategoryDto, FinancePeriodDto, LedgerEntryDto } from "@siteyonetim/finance-core";
import type {
  AccrualContextWarningsDto,
  AccrualRunCorrectionDto,
  DueAccrualRunDto,
  DueAccrualRunLineDto,
  DueDefinitionDto,
  DueLateFeePolicyDto,
  PeriodRegisterPageDto,
} from "@siteyonetim/finance-dues";
import type { BlockDto, UnitDto } from "@siteyonetim/property-core";
import type { MeterReadingDto, UnitMeterDto } from "@siteyonetim/property-meters";
import type { PartyDto } from "@siteyonetim/property-parties";
import type {
  PaginatedStaffProfiles,
  PaginatedStaffStatement,
} from "@siteyonetim/property-staff-finance";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { setDefinitionAutoAccrualAction, type DuesActionState } from "@/app/actions/dues";
import { DueDefinitionWizard } from "@/components/due-definition-wizard";
import { DuesAccrualPanel } from "@/components/dues-accrual-panel";
import { DuesLateFeePanel } from "@/components/dues-late-fee-panel";
import { DuesMetersPanel } from "@/components/dues-meters-panel";
import { FinanceTabs } from "@/components/finance-tabs";
import { PeriodRegisterPanel } from "@/components/period-register-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AccrualFilters } from "@/lib/accrual-filters";
import { definitionSummary, isSupplierLateFeeDefinition } from "@/lib/dues-definition-form";
import { resolveDuesTab, type DuesTab } from "@/lib/dues-tab";

const initial: DuesActionState = {};

type Props = {
  locale: string;
  propertyId: string;
  definitions: DueDefinitionDto[];
  runs: DueAccrualRunDto[];
  runLinesByRunId: Record<string, DueAccrualRunLineDto[]>;
  runCorrectionsByRunId: Record<string, AccrualRunCorrectionDto>;
  registerPage: PeriodRegisterPageDto;
  blocks: BlockDto[];
  registerFilters: {
    q: string;
    blockId: string | null;
    overdueOnly: boolean;
    withDebtOnly: boolean;
    year: number;
    month: number;
  };
  cashboxes: CashboxDto[];
  lateFeePolicy: DueLateFeePolicyDto | null;
  accrualWarnings: AccrualContextWarningsDto;
  meters: UnitMeterDto[];
  meterUnits: UnitDto[];
  readingsByMeterId: Record<string, MeterReadingDto[]>;
  period: FinancePeriodDto;
  categories: FinanceCategoryDto[];
  accounts: FinanceAccountDto[];
  ledger: { items: LedgerEntryDto[]; total: number; page: number; pageSize: number };
  orgParties: PartyDto[];
  staffProfiles: PaginatedStaffProfiles;
  staffStatement: PaginatedStaffStatement;
  initialTab?: string;
  initialUnitId?: string | null;
  initialRunId?: string | null;
  initialStaffProfileId?: string | null;
  accrualFilters: AccrualFilters;
  accrualUnits: UnitDto[];
  staffOperationsOnly?: boolean;
  canManageMeters?: boolean;
};

function AutoAccrualToggle({
  locale,
  propertyId,
  definitionId,
  enabled,
}: {
  locale: string;
  propertyId: string;
  definitionId: string;
  enabled: boolean;
}) {
  const t = useTranslations("dues");
  const [state, action, pending] = useActionState(
    setDefinitionAutoAccrualAction.bind(null, locale, propertyId, definitionId),
    initial,
  );
  return (
    <form action={action}>
      <input type="hidden" name="autoAccrualMonthly" value={enabled ? "false" : "true"} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {enabled ? t("autoAccrualDisable") : t("autoAccrualEnable")}
      </Button>
      {state.success ? <span className="sr-only">{t("autoAccrualSaved")}</span> : null}
    </form>
  );
}

export function DuesTabs({
  locale,
  propertyId,
  definitions,
  runs,
  runLinesByRunId,
  runCorrectionsByRunId,
  registerPage,
  blocks,
  registerFilters,
  cashboxes,
  lateFeePolicy,
  accrualWarnings,
  meters,
  meterUnits,
  readingsByMeterId,
  period,
  categories,
  accounts,
  ledger,
  orgParties,
  staffProfiles,
  staffStatement,
  initialTab,
  initialUnitId,
  initialRunId,
  initialStaffProfileId,
  accrualFilters,
  accrualUnits,
  staffOperationsOnly = false,
  canManageMeters = true,
}: Props) {
  const t = useTranslations("dues");
  const activeTab: DuesTab = resolveDuesTab(initialTab);

  if (staffOperationsOnly) {
    return (
      <DuesMetersPanel
        locale={locale}
        propertyId={propertyId}
        meters={meters}
        meterUnits={meterUnits}
        readingsByMeterId={readingsByMeterId}
        canManageMeters={canManageMeters}
      />
    );
  }

  return (
    <div className="space-y-4">
      {activeTab === "register" ? (
        <PeriodRegisterPanel
          locale={locale}
          propertyId={propertyId}
          registerPage={registerPage}
          blocks={blocks}
          cashboxes={cashboxes}
          runs={runs}
          filters={registerFilters}
          initialUnitId={initialUnitId}
        />
      ) : null}

      {activeTab === "definitions" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle>{t("definitionsList")}</CardTitle>
              <div className="flex flex-wrap gap-2">
                <DueDefinitionWizard mode="insert" locale={locale} propertyId={propertyId} variant="aidat" />
                <DueDefinitionWizard
                  mode="insert"
                  locale={locale}
                  propertyId={propertyId}
                  variant="supplier"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {definitions.map((d) => {
                const isSupplier = isSupplierLateFeeDefinition(d.calculationMode);
                return (
                <div key={d.id} className="flex flex-wrap items-start justify-between gap-2 border-b pb-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{d.name}</p>
                      {isSupplier ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {t("supplierLateFeeDefinitionBadge")}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground">{definitionSummary(d, t)}</p>
                    {d.autoAccrualMonthly ? (
                      <p className="text-xs text-primary">{t("autoAccrualBadge")}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <DueDefinitionWizard
                      mode="edit"
                      locale={locale}
                      propertyId={propertyId}
                      definition={d}
                      variant={isSupplier ? "supplier" : "aidat"}
                    />
                    {!isSupplier ? (
                      <AutoAccrualToggle locale={locale} propertyId={propertyId} definitionId={d.id} enabled={d.autoAccrualMonthly} />
                    ) : null}
                  </div>
                </div>
              );
              })}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === "accrual" ? (
        <DuesAccrualPanel
          locale={locale}
          propertyId={propertyId}
          definitions={definitions}
          runs={runs}
          runLinesByRunId={runLinesByRunId}
          runCorrectionsByRunId={runCorrectionsByRunId}
          accrualWarnings={accrualWarnings}
          initialRunId={initialRunId}
          filters={accrualFilters}
          units={accrualUnits}
        />
      ) : null}

      {activeTab === "meters" ? (
        <DuesMetersPanel
          locale={locale}
          propertyId={propertyId}
          meters={meters}
          meterUnits={meterUnits}
          readingsByMeterId={readingsByMeterId}
          canManageMeters={canManageMeters}
        />
      ) : null}

      {activeTab === "lateFee" ? (
        <DuesLateFeePanel
          locale={locale}
          propertyId={propertyId}
          policy={lateFeePolicy}
          defaultPeriod={{ year: registerFilters.year, month: registerFilters.month }}
        />
      ) : null}

      {activeTab === "expenses" ? (
        <FinanceTabs
          locale={locale}
          propertyId={propertyId}
          period={period}
          categories={categories}
          accounts={accounts}
          cashboxes={cashboxes}
          ledger={ledger}
          parties={orgParties}
          staffProfiles={staffProfiles}
          staffStatement={staffStatement}
          selectedStaffProfileId={initialStaffProfileId}
          activePanel="ledger"
          duesTab="expenses"
        />
      ) : null}

      {activeTab === "cashboxes" ? (
        <FinanceTabs
          locale={locale}
          propertyId={propertyId}
          period={period}
          categories={categories}
          accounts={accounts}
          cashboxes={cashboxes}
          ledger={ledger}
          parties={orgParties}
          staffProfiles={staffProfiles}
          staffStatement={staffStatement}
          selectedStaffProfileId={initialStaffProfileId}
          activePanel="cashboxes"
          showPeriodCard={false}
          duesTab="cashboxes"
        />
      ) : null}

      {activeTab === "accounts" ? (
        <FinanceTabs
          locale={locale}
          propertyId={propertyId}
          period={period}
          categories={categories}
          accounts={accounts}
          cashboxes={cashboxes}
          ledger={ledger}
          parties={orgParties}
          staffProfiles={staffProfiles}
          staffStatement={staffStatement}
          selectedStaffProfileId={initialStaffProfileId}
          activePanel="accounts"
          showPeriodCard={false}
          duesTab="accounts"
        />
      ) : null}

      {activeTab === "staffAccounts" ? (
        <FinanceTabs
          locale={locale}
          propertyId={propertyId}
          period={period}
          categories={categories}
          accounts={accounts}
          cashboxes={cashboxes}
          ledger={ledger}
          parties={orgParties}
          staffProfiles={staffProfiles}
          staffStatement={staffStatement}
          selectedStaffProfileId={initialStaffProfileId}
          activePanel="staffAccounts"
          showPeriodCard={false}
          duesTab="staffAccounts"
        />
      ) : null}

      {activeTab === "categories" ? (
        <FinanceTabs
          locale={locale}
          propertyId={propertyId}
          period={period}
          categories={categories}
          accounts={accounts}
          cashboxes={cashboxes}
          ledger={ledger}
          parties={orgParties}
          staffProfiles={staffProfiles}
          staffStatement={staffStatement}
          selectedStaffProfileId={initialStaffProfileId}
          activePanel="categories"
          showPeriodCard={false}
          duesTab="categories"
        />
      ) : null}
    </div>
  );
}
