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

import type { DuesTab } from "@/lib/dues-tab";
import { isFinanceDuesTab } from "@/lib/finance-tab";
import {
  getBlockService,
  getDuesService,
  getFinanceService,
  getMeterService,
  getPartyService,
  getUnitService,
} from "@/lib/services";

const PAGE_SIZE = 10;
const REGISTER_PAGE_SIZE = 15;

type DuesContext = {
  organizationId: string;
  propertyId: string;
  actorUserId: string;
};

export type PropertyDuesPageData = {
  definitions: DueDefinitionDto[];
  runs: DueAccrualRunDto[];
  runLinesByRunId: Record<string, DueAccrualRunLineDto[]>;
  runCorrectionsByRunId: Record<string, AccrualRunCorrectionDto>;
  registerPage: PeriodRegisterPageDto;
  blocks: BlockDto[];
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
  accrualUnits: UnitDto[];
};

function emptyLedger(page: number): PropertyDuesPageData["ledger"] {
  return { items: [], total: 0, page, pageSize: PAGE_SIZE };
}

function emptyRegisterPage(
  page: number,
  period: { year: number; month: number },
): PeriodRegisterPageDto {
  return {
    period,
    columns: [],
    rows: [],
    total: 0,
    page,
    pageSize: REGISTER_PAGE_SIZE,
  };
}

function emptyAccrualWarnings(propertyId: string, period: { year: number; month: number }): AccrualContextWarningsDto {
  return {
    propertyId,
    period,
    warnings: [],
    canGenerateAccrual: false,
    blockingCodes: ["NO_DEFINITIONS", "NO_UNITS"],
  };
}

function groupReadingsByMeterId(readings: MeterReadingDto[]): Record<string, MeterReadingDto[]> {
  const readingsByMeterId: Record<string, MeterReadingDto[]> = {};
  for (const reading of readings) {
    if (!readingsByMeterId[reading.meterId]) {
      readingsByMeterId[reading.meterId] = [];
    }
    readingsByMeterId[reading.meterId]!.push(reading);
  }
  return readingsByMeterId;
}

export async function loadPropertyDuesPageData(input: {
  ctx: DuesContext;
  activeTab: DuesTab;
  page: number;
  registerFilters: {
    q: string;
    blockId: string | null;
    overdueOnly: boolean;
    withDebtOnly: boolean;
    year: number;
    month: number;
  };
  accrualPeriod: { year: number; month: number };
}): Promise<PropertyDuesPageData> {
  const { ctx, activeTab, page, registerFilters, accrualPeriod } = input;
  const dues = getDuesService();
  const finance = getFinanceService();
  const period = await finance.ensureOpenPeriod(ctx);

  const needsFinance = isFinanceDuesTab(activeTab);
  const needsAccrual = activeTab === "accrual";
  const needsDefinitions = activeTab === "definitions" || needsAccrual;
  const needsAccrualUnits = needsAccrual;
  const needsRegister = activeTab === "register";
  const needsLateFee = activeTab === "lateFee";
  const needsMeters = activeTab === "meters";
  const needsCashboxes = needsRegister || needsFinance;
  const needsBlocks = needsRegister;

  const [
    definitions,
    runs,
    runLinesByRunId,
    runCorrectionsByRunId,
    registerPage,
    blocksPage,
    cashboxes,
    lateFeePolicy,
    meterBundle,
    financeBundle,
    accrualUnitsPage,
  ] = await Promise.all([
    needsDefinitions ? dues.listDefinitions(ctx) : Promise.resolve([]),
    needsAccrual ? dues.listAccrualRuns(ctx) : Promise.resolve([]),
    needsAccrual ? dues.listAccrualRunLinesByProperty(ctx) : Promise.resolve({}),
    needsAccrual ? dues.listAccrualRunCorrections(ctx) : Promise.resolve({}),
    needsRegister
      ? dues.listPeriodRegister({
          ...ctx,
          page,
          pageSize: REGISTER_PAGE_SIZE,
          year: registerFilters.year,
          month: registerFilters.month,
          q: registerFilters.q || undefined,
          blockId: registerFilters.blockId,
          overdueOnly: registerFilters.overdueOnly,
          withDebtOnly: registerFilters.withDebtOnly,
        })
      : Promise.resolve(null),
    needsBlocks ? getBlockService().list({ ...ctx, page: 1, pageSize: 200 }) : Promise.resolve(null),
    needsCashboxes ? finance.listCashboxes(ctx) : Promise.resolve([]),
    needsLateFee ? dues.getLateFeePolicy(ctx) : Promise.resolve(null),
    needsMeters
      ? Promise.all([
          getMeterService().listMeters(ctx),
          getUnitService().list({ ...ctx, page: 1, pageSize: 500 }),
          getMeterService().listReadingsForProperty(ctx),
        ]).then(([meters, meterUnitsPage, meterReadings]) => ({
          meters,
          meterUnits: meterUnitsPage.items,
          readingsByMeterId: groupReadingsByMeterId(meterReadings),
        }))
      : Promise.resolve(null),
    needsFinance
      ? Promise.all([
          finance.listCategories(ctx),
          finance.listAccounts(ctx, 1, 100),
          finance.listLedger({ ...ctx, page, pageSize: PAGE_SIZE }),
          getPartyService().list({ organizationId: ctx.organizationId, propertyId: null, page: 1, pageSize: 200 }),
        ]).then(([categories, accountPage, ledger, orgPartiesPage]) => ({
          categories,
          accounts: accountPage.items,
          ledger,
          orgParties: orgPartiesPage.items,
        }))
      : Promise.resolve(null),
    needsAccrualUnits
      ? getUnitService().list({ ...ctx, page: 1, pageSize: 500 })
      : Promise.resolve(null),
  ]);

  const accrualWarnings = needsAccrual
    ? await dues.getAccrualContextWarnings(ctx, accrualPeriod, {
        definitions,
        runs,
        runLinesByRunId,
        runCorrections: runCorrectionsByRunId,
      })
    : emptyAccrualWarnings(ctx.propertyId, accrualPeriod);

  return {
    definitions,
    runs,
    runLinesByRunId,
    runCorrectionsByRunId,
    registerPage:
      registerPage ??
      emptyRegisterPage(page, { year: registerFilters.year, month: registerFilters.month }),
    blocks: blocksPage?.items ?? [],
    cashboxes,
    lateFeePolicy,
    accrualWarnings,
    meters: meterBundle?.meters ?? [],
    meterUnits: meterBundle?.meterUnits ?? [],
    readingsByMeterId: meterBundle?.readingsByMeterId ?? {},
    period,
    categories: financeBundle?.categories ?? [],
    accounts: financeBundle?.accounts ?? [],
    ledger: financeBundle?.ledger ?? emptyLedger(page),
    orgParties: financeBundle?.orgParties ?? [],
    accrualUnits: accrualUnitsPage?.items ?? [],
  };
}
