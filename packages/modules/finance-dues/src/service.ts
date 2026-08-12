import {
  DueAccrualLineKind,
  DueAccrualStatus,
  DueCalculationMode,
  DueLineStatus,
  FinancePeriodStatus,
  LateFeeRateKind,
  MeterKind,
  Prisma,
  SupplierLateFeeAllocationMode,
} from "@siteyonetim/db";
import { createAuditService } from "@siteyonetim/platform-audit";
import type { MeterServiceContract } from "@siteyonetim/property-meters";
import { createMeterService } from "@siteyonetim/property-meters";
import { createReportingCoreService } from "@siteyonetim/reporting-core";

import type {
  AccrualBillInput,
  AccrualContextPreload,
  AccrualContextWarningsDto,
  AccrualContextWarningDto,
  AccrualMissingUnitDto,
  AccrualRunCorrectionDto,
  ApplyLateFeesInput,
  CreateDueDefinitionInput,
  DebtOverviewDto,
  DebtRowDto,
  DueAccrualLineDto,
  DueAccrualRunDto,
  DueAccrualRunLineDto,
  DueDefinitionDto,
  DueLateFeePolicyDto,
  DuePaymentTargetDto,
  DuesContext,
  DuesServiceContract,
  ExportPeriodRegisterInput,
  ExportUnitDebtDetailInput,
  ExportedPeriodRegisterFile,
  GenerateAccrualInput,
  ListDebtRowsInput,
  ListOpenLinesInput,
  ListPeriodRegisterInput,
  PaginatedDebtRows,
  PeriodRegisterCellDto,
  PeriodRegisterPageDto,
  PeriodRegisterRowDto,
  PortalMemberDebtSummaryDto,
  PortalMemberDebtSummaryInput,
  PortalOpenDebtLineDto,
  PaymentAllocationInput,
  RecalculateAccrualInput,
  RecordPaymentInput,
  StatementLineDto,
  UnitDebtDetailDto,
  UpdateDueDefinitionInput,
  UpsertLateFeePolicyInput,
  UpsertLegalInterestRateInput,
  LegalInterestRateDto,
  LateFeePolicyTargetDto,
  MeterReadingReminderTargetDto,
} from "./contract";
import { DuesRepository } from "./repository";
import { analyzeMissingAccrualUnits } from "./accrual-missing-units";
import {
  countMissingPreviousIndex,
  hasMeterRunMismatch,
  isMeterDefinitionMode,
  needsConsumptionRecalculate,
} from "./accrual-context";
import { supportsSupplementAppend } from "./accrual-run-guards";
import { sortByUnitCode } from "./unit-sort";
import { allocateSupplierLateFee } from "./supplier-late-fee-allocation";
import {
  buildPeriodRegisterDocument,
  PERIOD_REGISTER_EXPORT_PAGE_SIZE,
} from "./period-register-export";
import { buildUnitDebtDetailDocument } from "./unit-debt-detail-export";

function mapDefinition(d: {
  id: string;
  name: string;
  calculationMode: DueCalculationMode;
  fixedAmount: Prisma.Decimal | null;
  ratePerM2: Prisma.Decimal | null;
  meterKind: import("@siteyonetim/db").MeterKind | null;
  supplierLateFeeAllocationMode: SupplierLateFeeAllocationMode | null;
  active: boolean;
  autoAccrualMonthly: boolean;
}): DueDefinitionDto {
  return {
    id: d.id,
    name: d.name,
    calculationMode: d.calculationMode,
    fixedAmount: d.fixedAmount?.toString() ?? null,
    ratePerM2: d.ratePerM2?.toString() ?? null,
    meterKind: d.meterKind,
    supplierLateFeeAllocationMode: d.supplierLateFeeAllocationMode,
    autoAccrualMonthly: d.autoAccrualMonthly,
    active: d.active,
  };
}

function mapRun(r: {
  id: string;
  dueDefinitionId: string;
  year: number;
  month: number;
  status: import("@siteyonetim/db").DueAccrualStatus;
  totalAmount: Prisma.Decimal;
  supplierLateFeeAllocationMode: SupplierLateFeeAllocationMode | null;
  supplierReference: string | null;
  dueDefinition: {
    name: string;
    calculationMode: DueCalculationMode;
    meterKind: import("@siteyonetim/db").MeterKind | null;
  };
  _count: { lines: number };
}): DueAccrualRunDto {
  return {
    id: r.id,
    dueDefinitionId: r.dueDefinitionId,
    dueDefinitionName: r.dueDefinition.name,
    calculationMode: r.dueDefinition.calculationMode,
    meterKind: r.dueDefinition.meterKind,
    supplierLateFeeAllocationMode: r.supplierLateFeeAllocationMode,
    supplierReference: r.supplierReference,
    year: r.year,
    month: r.month,
    status: r.status,
    totalAmount: r.totalAmount.toString(),
    lineCount: r._count.lines,
  };
}

function dueDate(year: number, month: number, dueDayOfMonth: number) {
  const lastDay = new Date(year, month, 0).getDate();
  const day = Math.min(Math.max(dueDayOfMonth, 1), lastDay);
  return new Date(year, month - 1, day);
}

function daysOverdue(accrualYear: number, accrualMonth: number, dueDayOfMonth: number, now = new Date()) {
  const due = dueDate(accrualYear, accrualMonth, dueDayOfMonth);
  const diff = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function minDecimal(a: Prisma.Decimal, b: Prisma.Decimal) {
  return a.lt(b) ? a : b;
}

type DebtLineRow = Awaited<ReturnType<DuesRepository["listDebtLines"]>>[number];

function aggregateDebtRows(lines: DebtLineRow[], dueDay: number): DebtRowDto[] {
  const byUnit = new Map<
    string,
    DebtRowDto & { _b0: Prisma.Decimal; _b1: Prisma.Decimal; _b2: Prisma.Decimal }
  >();

  for (const line of lines) {
    const remaining = line.amount.sub(line.paidAmount);
    if (remaining.lte(0)) continue;

    const overdue = daysOverdue(line.accrualRun.year, line.accrualRun.month, dueDay);
    let bucket0 = new Prisma.Decimal(0);
    let bucket1 = new Prisma.Decimal(0);
    let bucket2 = new Prisma.Decimal(0);
    if (overdue <= 30) bucket0 = remaining;
    else if (overdue <= 60) bucket1 = remaining;
    else bucket2 = remaining;

    const key = line.unit.id;
    const linePartyId = line.party?.id ?? null;
    const existing = byUnit.get(key);
    if (!existing) {
      byUnit.set(key, {
        unitId: line.unit.id,
        unitCode: line.unit.code,
        blockId: line.unit.blockId,
        blockName: line.unit.block?.name ?? null,
        partyId: linePartyId,
        partyName: line.party?.displayName ?? null,
        totalDebt: remaining.toString(),
        aging0To30: bucket0.toString(),
        aging31To60: bucket1.toString(),
        aging61Plus: bucket2.toString(),
        _b0: bucket0,
        _b1: bucket1,
        _b2: bucket2,
      });
    } else {
      if (!existing.partyId && linePartyId) {
        existing.partyId = linePartyId;
        existing.partyName = line.party?.displayName ?? existing.partyName;
      }
      existing._b0 = existing._b0.add(bucket0);
      existing._b1 = existing._b1.add(bucket1);
      existing._b2 = existing._b2.add(bucket2);
      existing.totalDebt = new Prisma.Decimal(existing.totalDebt).add(remaining).toString();
      existing.aging0To30 = existing._b0.toString();
      existing.aging31To60 = existing._b1.toString();
      existing.aging61Plus = existing._b2.toString();
      if (!existing.partyName && line.party?.displayName) {
        existing.partyName = line.party.displayName;
      }
    }
  }

  return sortByUnitCode(
    [...byUnit.values()].map(({ _b0, _b1, _b2, ...row }) => row),
  );
}

function buildPaymentTargets(
  lines: DebtLineRow[],
  partyByUnit: Awaited<ReturnType<DuesRepository["getActivePartyMapByUnit"]>>,
): DuePaymentTargetDto[] {
  const targets = new Map<string, DuePaymentTargetDto>();

  for (const line of lines) {
    const remaining = line.amount.sub(line.paidAmount);
    if (remaining.lte(0)) continue;

    let partyId = line.party?.id ?? null;
    let partyName = line.party?.displayName ?? null;
    if (!partyId) {
      const occ = partyByUnit.get(line.unit.id);
      if (!occ) continue;
      partyId = occ.partyId;
      partyName = occ.partyName;
    }

    const existing = targets.get(line.unit.id);
    if (!existing) {
      targets.set(line.unit.id, {
        unitId: line.unit.id,
        unitCode: line.unit.code,
        partyId,
        partyName: partyName ?? "",
        totalDebt: remaining.toString(),
      });
    } else {
      existing.totalDebt = new Prisma.Decimal(existing.totalDebt).add(remaining).toString();
    }
  }

  return sortByUnitCode([...targets.values()]);
}

function mapPortalOpenDebtLine(
  row: Awaited<ReturnType<DuesRepository["listPortalOpenLinesForParty"]>>[number],
): PortalOpenDebtLineDto {
  const remaining = row.amount.sub(row.paidAmount);
  const sourceRun = row.sourceLine?.accrualRun;
  return {
    id: row.id,
    year: row.accrualRun.year,
    month: row.accrualRun.month,
    lineKind: row.lineKind,
    dueDefinitionName: row.accrualRun.dueDefinition.name,
    unitCode: row.unit.code,
    blockName: row.unit.block?.name ?? null,
    amount: row.amount.toString(),
    paidAmount: row.paidAmount.toString(),
    remaining: remaining.toString(),
    ...(row.lineKind === DueAccrualLineKind.LATE_FEE && sourceRun
      ? {
          sourceYear: sourceRun.year,
          sourceMonth: sourceRun.month,
          sourceDueDefinitionName: sourceRun.dueDefinition.name,
        }
      : {}),
    ...(row.lineKind === DueAccrualLineKind.SUPPLIER_LATE_FEE
      ? {
          supplierLateFeeAllocationMode: row.accrualRun.supplierLateFeeAllocationMode,
          supplierReference: row.accrualRun.supplierReference,
        }
      : {}),
  };
}

function mapOpenLine(r: Awaited<ReturnType<DuesRepository["listOpenLinesByUnit"]>>[number]): DueAccrualLineDto {
  const remaining = r.amount.sub(r.paidAmount);
  const sourceRun = r.sourceLine?.accrualRun;
  return {
    id: r.id,
    unitId: r.unit.id,
    unitCode: r.unit.code,
    partyId: r.party?.id ?? null,
    partyName: r.party?.displayName ?? null,
    amount: r.amount.toString(),
    paidAmount: r.paidAmount.toString(),
    remaining: remaining.toString(),
    status: r.status,
    year: r.accrualRun.year,
    month: r.accrualRun.month,
    lineKind: r.lineKind,
    dueDefinitionName: r.accrualRun.dueDefinition.name,
    ...(r.lineKind === DueAccrualLineKind.LATE_FEE && sourceRun
      ? {
          sourceYear: sourceRun.year,
          sourceMonth: sourceRun.month,
          sourceDueDefinitionName: sourceRun.dueDefinition.name,
        }
      : {}),
    ...(r.lineKind === DueAccrualLineKind.SUPPLIER_LATE_FEE
      ? {
          supplierLateFeeAllocationMode: r.accrualRun.supplierLateFeeAllocationMode,
          supplierReference: r.accrualRun.supplierReference,
        }
      : {}),
  };
}

function formatAccrualChargeLabel(input: {
  lineKind: DueAccrualLineKind;
  dueDefinitionName: string;
  year: number;
  month: number;
  sourceYear?: number | null;
  sourceMonth?: number | null;
  sourceDueDefinitionName?: string | null;
}): string {
  const period = `${input.month}/${input.year}`;
  if (
    input.lineKind === DueAccrualLineKind.LATE_FEE &&
    input.sourceDueDefinitionName &&
    input.sourceMonth != null &&
    input.sourceYear != null
  ) {
    return `${input.dueDefinitionName} (${input.sourceDueDefinitionName} ${input.sourceMonth}/${input.sourceYear})`;
  }
  return `${input.dueDefinitionName} ${period}`;
}

function formatStatementAccrualLabel(line: {
  lineKind: DueAccrualLineKind;
  unit: { code: string };
  accrualRun: { year: number; month: number; dueDefinition: { name: string } };
  sourceLine?: {
    accrualRun: { year: number; month: number; dueDefinition: { name: string } };
  } | null;
}): string {
  const sourceRun = line.sourceLine?.accrualRun;
  const charge = formatAccrualChargeLabel({
    lineKind: line.lineKind,
    dueDefinitionName: line.accrualRun.dueDefinition.name,
    year: line.accrualRun.year,
    month: line.accrualRun.month,
    sourceYear: sourceRun?.year,
    sourceMonth: sourceRun?.month,
    sourceDueDefinitionName: sourceRun?.dueDefinition.name,
  });
  return `${charge} — ${line.unit.code}`;
}

function formatStatementPaymentLabel(payment: {
  description: string | null;
  documentNo: string | null;
  cashbox?: { name: string } | null;
  allocations?: Array<{
    dueAccrualLine: {
      lineKind: DueAccrualLineKind;
      accrualRun: { year: number; month: number; dueDefinition: { name: string } };
      sourceLine?: {
        accrualRun: { year: number; month: number; dueDefinition: { name: string } };
      } | null;
    };
  }>;
}): string {
  const base = payment.description?.trim() || "Tahsilat";
  const doc = payment.documentNo?.trim();
  const head = doc ? `${base} (${doc})` : base;
  const targets = [
    ...new Set(
      (payment.allocations ?? []).map((allocation) => {
        const dueLine = allocation.dueAccrualLine;
        const sourceRun = dueLine.sourceLine?.accrualRun;
        return formatAccrualChargeLabel({
          lineKind: dueLine.lineKind,
          dueDefinitionName: dueLine.accrualRun.dueDefinition.name,
          year: dueLine.accrualRun.year,
          month: dueLine.accrualRun.month,
          sourceYear: sourceRun?.year,
          sourceMonth: sourceRun?.month,
          sourceDueDefinitionName: sourceRun?.dueDefinition.name,
        });
      }),
    ),
  ];
  const parts = [head];
  if (payment.cashbox?.name) parts.push(payment.cashbox.name);
  if (targets.length > 0) parts.push(targets.join(", "));
  return parts.join(" — ");
}

function monthlyPercentFromAnnual(annual: Prisma.Decimal) {
  return annual.div(12);
}

function mapPolicyDto(
  row: {
    propertyId: string;
    rateKind: LateFeeRateKind;
    monthlyRatePercent: Prisma.Decimal;
    graceDays: number;
    dueDayOfMonth: number;
    active: boolean;
  },
  effectiveMonthly: Prisma.Decimal | null,
): DueLateFeePolicyDto {
  return {
    propertyId: row.propertyId,
    rateKind: row.rateKind,
    monthlyRatePercent: row.monthlyRatePercent.toString(),
    effectiveMonthlyRatePercent: effectiveMonthly?.toString() ?? null,
    graceDays: row.graceDays,
    dueDayOfMonth: row.dueDayOfMonth,
    active: row.active,
  };
}

type AccrualLinePreload = {
  units?: Awaited<ReturnType<DuesRepository["getUnitsWithArea"]>>;
  partyMap?: Map<string, { partyId: string; accountId: string }>;
};

type AccrualLineData = {
  unitId: string;
  partyId: string | null;
  financeAccountId: string | null;
  amount: Prisma.Decimal;
  lineKind?: DueAccrualLineKind;
};

type UnitRow = {
  id: string;
  areaM2: Prisma.Decimal | null;
  shareRatio: Prisma.Decimal | null;
};

function splitByShare(units: UnitRow[], total: Prisma.Decimal) {
  const sumShare = units.reduce(
    (acc, u) => acc.add(u.shareRatio ?? new Prisma.Decimal(0)),
    new Prisma.Decimal(0),
  );
  if (sumShare.lte(0)) return new Map<string, Prisma.Decimal>();
  const map = new Map<string, Prisma.Decimal>();
  for (const unit of units) {
    const share = unit.shareRatio ?? new Prisma.Decimal(0);
    if (share.lte(0)) continue;
    map.set(unit.id, total.mul(share).div(sumShare));
  }
  return map;
}

function splitByArea(units: UnitRow[], total: Prisma.Decimal) {
  const sumArea = units.reduce(
    (acc, u) => acc.add(u.areaM2 ?? new Prisma.Decimal(0)),
    new Prisma.Decimal(0),
  );
  if (sumArea.lte(0)) return new Map<string, Prisma.Decimal>();
  const map = new Map<string, Prisma.Decimal>();
  for (const unit of units) {
    const area = unit.areaM2 ?? new Prisma.Decimal(0);
    if (area.lte(0)) continue;
    map.set(unit.id, total.mul(area).div(sumArea));
  }
  return map;
}

function splitByMeterConsumption(
  consumptions: { unitId: string; consumption: string }[],
  total: Prisma.Decimal,
) {
  const sorted = [...consumptions].sort((a, b) => a.unitId.localeCompare(b.unitId));
  const map = new Map<string, Prisma.Decimal>();
  const sum = consumptions.reduce(
    (acc, row) => acc.add(new Prisma.Decimal(row.consumption)),
    new Prisma.Decimal(0),
  );

  if (sum.lte(0)) {
    for (const row of sorted) {
      map.set(row.unitId, new Prisma.Decimal(0));
    }
    return map;
  }

  const positive = sorted.filter((row) => new Prisma.Decimal(row.consumption).gt(0));
  let allocated = new Prisma.Decimal(0);

  for (let i = 0; i < positive.length; i += 1) {
    const row = positive[i]!;
    const consumption = new Prisma.Decimal(row.consumption);
    const isLast = i === positive.length - 1;
    const amount = isLast
      ? total.sub(allocated)
      : total.mul(consumption).div(sum).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    map.set(row.unitId, amount.lt(0) ? new Prisma.Decimal(0) : amount);
    allocated = allocated.add(map.get(row.unitId)!);
  }

  for (const row of sorted) {
    if (!map.has(row.unitId)) {
      map.set(row.unitId, new Prisma.Decimal(0));
    }
  }

  return map;
}

function sumConsumptions(consumptions: { consumption: string }[]) {
  return consumptions.reduce(
    (acc, row) => acc.add(new Prisma.Decimal(row.consumption)),
    new Prisma.Decimal(0),
  );
}

function assertBillConsumptionMatches(
  actualTotal: Prisma.Decimal,
  totalBillConsumptionM3?: string | null,
) {
  const expectedRaw = totalBillConsumptionM3?.replace(",", ".")?.trim() ?? "";
  if (!expectedRaw) throw new Error("TOTAL_BILL_CONSUMPTION_REQUIRED");
  const expected = new Prisma.Decimal(expectedRaw);
  if (expected.lte(0)) throw new Error("BILL_CONSUMPTION_INVALID");
  if (actualTotal.sub(expected).abs().gt(new Prisma.Decimal("0.1"))) {
    throw new Error("BILL_CONSUMPTION_MISMATCH");
  }
}

function accrualModeNeedsBillInput(mode: DueCalculationMode): boolean {
  return (
    mode === DueCalculationMode.ALLOCATED_BILL ||
    mode === DueCalculationMode.METER_ALLOCATED_BILL ||
    mode === DueCalculationMode.SUPPLIER_LATE_FEE_BILL
  );
}

function validateDefinitionInput(input: {
  name: string;
  calculationMode: DueCalculationMode;
  fixedAmount?: string | null;
  ratePerM2?: string | null;
  meterKind?: import("@siteyonetim/db").MeterKind | null;
  supplierLateFeeAllocationMode?: SupplierLateFeeAllocationMode | null;
}) {
  const name = input.name.trim();
  if (!name) throw new Error("DEFINITION_NAME_REQUIRED");

  const mode = input.calculationMode;
  if (mode === DueCalculationMode.FIXED && !input.fixedAmount) {
    throw new Error("FIXED_AMOUNT_REQUIRED");
  }
  if (mode === DueCalculationMode.AREA_M2 && !input.ratePerM2) {
    throw new Error("RATE_REQUIRED");
  }
  if (mode === DueCalculationMode.SHARE_RATIO && !input.fixedAmount) {
    throw new Error("SHARE_POOL_REQUIRED");
  }
  if (mode === DueCalculationMode.METER_CONSUMPTION) {
    if (!input.meterKind) throw new Error("METER_KIND_REQUIRED");
    if (!input.ratePerM2) throw new Error("RATE_REQUIRED");
  }
  if (mode === DueCalculationMode.METER_ALLOCATED_BILL) {
    if (!input.meterKind) throw new Error("METER_KIND_REQUIRED");
  }
  if (mode === DueCalculationMode.SUPPLIER_LATE_FEE_BILL) {
    if (!input.supplierLateFeeAllocationMode) throw new Error("SUPPLIER_LATE_FEE_MODE_REQUIRED");
  }

  return { name, mode };
}

export class DuesService implements DuesServiceContract {
  constructor(
    private readonly repository = new DuesRepository(),
    private readonly audit = createAuditService(),
    private readonly meters: MeterServiceContract = createMeterService(),
  ) {}

  private async assertCtx(ctx: DuesContext) {
    const ok = await this.repository.assertProperty(ctx.organizationId, ctx.propertyId);
    if (!ok) throw new Error("PROPERTY_NOT_FOUND");
  }

  async listDefinitions(ctx: DuesContext) {
    await this.assertCtx(ctx);
    const rows = await this.repository.listDefinitions(ctx);
    return rows.map(mapDefinition);
  }

  async createDefinition(input: CreateDueDefinitionInput) {
    await this.assertCtx(input);
    const { name, mode } = validateDefinitionInput(input);

    const existing = await this.repository.findDefinitionByName(input.propertyId, name);
    if (existing) {
      throw new Error("DEFINITION_NAME_DUPLICATE");
    }

    const autoAccrualMonthly =
      mode === DueCalculationMode.SUPPLIER_LATE_FEE_BILL ? false : (input.autoAccrualMonthly ?? false);

    try {
      const created = await this.repository.createDefinition({ ...input, name, autoAccrualMonthly });
      await this.audit.record({
        organizationId: input.organizationId,
        userId: input.actorUserId,
        action: "dues.definition.create",
        entityType: "DueDefinition",
        entityId: created.id,
        metadata: { name, calculationMode: mode },
      });
      return mapDefinition(created);
    } catch (err) {
      if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002") {
        throw new Error("DEFINITION_NAME_DUPLICATE");
      }
      throw err;
    }
  }

  async updateDefinition(input: UpdateDueDefinitionInput) {
    await this.assertCtx(input);
    const { name, mode } = validateDefinitionInput(input);

    const existing = await this.repository.getDefinition(input, input.definitionId);
    if (!existing) throw new Error("DEFINITION_NOT_FOUND");

    if (existing.calculationMode !== mode) {
      const involvesSupplier =
        existing.calculationMode === DueCalculationMode.SUPPLIER_LATE_FEE_BILL ||
        mode === DueCalculationMode.SUPPLIER_LATE_FEE_BILL;
      if (involvesSupplier) {
        throw new Error("CALCULATION_MODE_CHANGE_NOT_ALLOWED");
      }
    }

    const duplicate = await this.repository.findDefinitionByName(input.propertyId, name);
    if (duplicate && duplicate.id !== input.definitionId) {
      throw new Error("DEFINITION_NAME_DUPLICATE");
    }

    const autoAccrualMonthly =
      mode === DueCalculationMode.SUPPLIER_LATE_FEE_BILL ? false : (input.autoAccrualMonthly ?? false);

    try {
      const updated = await this.repository.updateDefinition({ ...input, name, autoAccrualMonthly });
      if (!updated) throw new Error("DEFINITION_NOT_FOUND");
      await this.audit.record({
        organizationId: input.organizationId,
        userId: input.actorUserId,
        action: "dues.definition.update",
        entityType: "DueDefinition",
        entityId: updated.id,
        metadata: { name, calculationMode: mode },
      });
      return mapDefinition(updated);
    } catch (err) {
      if (err instanceof Error && err.message === "DEFINITION_NOT_FOUND") {
        throw err;
      }
      if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002") {
        throw new Error("DEFINITION_NAME_DUPLICATE");
      }
      throw err;
    }
  }

  async setDefinitionAutoAccrual(
    ctx: DuesContext,
    definitionId: string,
    autoAccrualMonthly: boolean,
  ): Promise<DueDefinitionDto> {
    await this.assertCtx(ctx);
    const existing = await this.repository.getDefinition(ctx, definitionId);
    if (!existing) throw new Error("DEFINITION_NOT_FOUND");
    if (existing.calculationMode === DueCalculationMode.SUPPLIER_LATE_FEE_BILL) {
      throw new Error("SUPPLIER_LATE_FEE_AUTO_ACCRUAL_NOT_ALLOWED");
    }
    const updated = await this.repository.setDefinitionAutoAccrual(ctx, definitionId, autoAccrualMonthly);
    if (!updated) throw new Error("DEFINITION_NOT_FOUND");
    await this.audit.record({
      organizationId: ctx.organizationId,
      userId: ctx.actorUserId,
      action: "dues.definition.autoAccrual",
      entityType: "DueDefinition",
      entityId: updated.id,
      metadata: { autoAccrualMonthly },
    });
    return mapDefinition(updated);
  }

  async listAutoAccrualDefinitionTargets(): Promise<import("./contract").AutoAccrualTargetDto[]> {
    const rows = await this.repository.listAutoAccrualDefinitionTargets();
    return rows.map((r) => ({
      organizationId: r.organizationId,
      propertyId: r.propertyId,
      dueDefinitionId: r.id,
      calculationMode: r.calculationMode,
    }));
  }

  async listDraftAccrualReminderTargets(year: number, month: number) {
    if (month < 1 || month > 12) throw new Error("INVALID_MONTH");
    return this.repository.listDraftAccrualReminderTargets(year, month);
  }

  async listMeterReadingReminderTargets(year: number, month: number) {
    if (month < 1 || month > 12) throw new Error("INVALID_MONTH");

    const properties = await this.repository.listPropertiesWithActiveMeterDefinitions();
    const targets: MeterReadingReminderTargetDto[] = [];

    for (const property of properties) {
      let missingReadingCount = 0;
      const missingKinds: MeterKind[] = [];
      const ctx = {
        organizationId: property.organizationId,
        propertyId: property.propertyId,
      };

      for (const meterKind of property.meterKinds) {
        const [consumptions, meters] = await Promise.all([
          this.meters.getConsumptionByUnit({ ...ctx, kind: meterKind, year, month }),
          this.meters.listMeters(ctx),
        ]);
        const activeForKind = meters.filter((meter) => meter.kind === meterKind && meter.active);
        if (activeForKind.length === 0) continue;

        const missing = activeForKind.length - consumptions.length;
        if (missing > 0) {
          missingReadingCount += missing;
          missingKinds.push(meterKind);
        }
      }

      if (missingReadingCount > 0) {
        targets.push({
          organizationId: property.organizationId,
          propertyId: property.propertyId,
          propertyName: property.propertyName,
          year,
          month,
          missingReadingCount,
          meterKinds: missingKinds,
        });
      }
    }

    return targets;
  }

  async listAccrualRuns(ctx: DuesContext) {
    await this.assertCtx(ctx);
    const rows = await this.repository.listRuns(ctx);
    return rows.map(mapRun);
  }

  async listAccrualRunLinesByProperty(ctx: DuesContext): Promise<Record<string, DueAccrualRunLineDto[]>> {
    await this.assertCtx(ctx);
    const rows = await this.repository.listRunLinesByProperty(ctx);
    const consumptionCache = new Map<string, Map<string, import("@siteyonetim/property-meters").UnitMeterPeriodDto>>();

    for (const row of rows) {
      const definition = row.accrualRun.dueDefinition;
      const usesMeter =
        definition.calculationMode === DueCalculationMode.METER_CONSUMPTION ||
        definition.calculationMode === DueCalculationMode.METER_ALLOCATED_BILL;
      if (!usesMeter || !definition.meterKind) {
        continue;
      }
      const cacheKey = `${row.accrualRun.year}-${row.accrualRun.month}-${definition.meterKind}`;
      if (consumptionCache.has(cacheKey)) {
        continue;
      }
      const periods = await this.meters.getMeterPeriodByUnit({
        organizationId: ctx.organizationId,
        propertyId: ctx.propertyId,
        kind: definition.meterKind,
        year: row.accrualRun.year,
        month: row.accrualRun.month,
      });
      consumptionCache.set(
        cacheKey,
        new Map(periods.map((item) => [item.unitId, item])),
      );
    }

    const grouped: Record<string, DueAccrualRunLineDto[]> = {};
    for (const row of rows) {
      const definition = row.accrualRun.dueDefinition;
      const usesMeter =
        definition.calculationMode === DueCalculationMode.METER_CONSUMPTION ||
        definition.calculationMode === DueCalculationMode.METER_ALLOCATED_BILL;
      const cacheKey =
        usesMeter && definition.meterKind
          ? `${row.accrualRun.year}-${row.accrualRun.month}-${definition.meterKind}`
          : null;
      const period = cacheKey ? consumptionCache.get(cacheKey)?.get(row.unitId) : undefined;
      const line: DueAccrualRunLineDto = {
        id: row.id,
        unitId: row.unitId,
        unitCode: row.unit.code,
        partyName:
          row.party?.displayName ?? row.unit.occupancies[0]?.party?.displayName ?? null,
        amount: row.amount.toString(),
        meterConsumption: period?.consumption ?? null,
        meterIndexCurrent: period?.currentIndex ?? null,
        meterIndexPrevious: period?.previousIndex ?? null,
      };
      if (!grouped[row.accrualRun.id]) {
        grouped[row.accrualRun.id] = [];
      }
      grouped[row.accrualRun.id]!.push(line);
    }

    for (const runId of Object.keys(grouped)) {
      grouped[runId] = sortByUnitCode(grouped[runId]!);
    }

    return grouped;
  }

  private async buildAccrualLineData(
    ctx: DuesContext,
    definition: NonNullable<Awaited<ReturnType<DuesRepository["getDefinition"]>>>,
    year: number,
    month: number,
    bill?: AccrualBillInput,
    preload?: AccrualLinePreload,
  ): Promise<AccrualLineData[]> {
    const units = preload?.units ?? (await this.repository.getUnitsWithArea(ctx));
    if (units.length === 0) throw new Error("NO_UNITS");

    const partyMap =
      preload?.partyMap ?? (await this.repository.resolvePartyAccountsForUnits(ctx, units));
    const lineData: AccrualLineData[] = [];
    const unitRows: UnitRow[] = units.map((u) => ({
      id: u.id,
      areaM2: u.areaM2,
      shareRatio: u.shareRatio,
    }));

    if (definition.calculationMode === DueCalculationMode.METER_CONSUMPTION) {
      if (!definition.meterKind) throw new Error("METER_KIND_REQUIRED");
      const rate = new Prisma.Decimal(definition.ratePerM2 ?? 0);
      const consumptions = await this.meters.getConsumptionByUnit({
        organizationId: ctx.organizationId,
        propertyId: ctx.propertyId,
        kind: definition.meterKind,
        year,
        month,
      });
      for (const row of consumptions) {
        const amount = new Prisma.Decimal(row.consumption).mul(rate);
        const link = partyMap.get(row.unitId);
        lineData.push({
          unitId: row.unitId,
          partyId: link?.partyId ?? null,
          financeAccountId: link?.accountId ?? null,
          amount,
        });
      }
    } else if (definition.calculationMode === DueCalculationMode.METER_ALLOCATED_BILL) {
      if (!definition.meterKind) throw new Error("METER_KIND_REQUIRED");
      const totalRaw = bill?.totalBillAmount?.replace(",", ".") ?? "";
      if (!totalRaw) throw new Error("TOTAL_BILL_REQUIRED");
      const total = new Prisma.Decimal(totalRaw);
      if (total.lte(0)) throw new Error("AMOUNT_INVALID");
      const consumptions = await this.meters.getConsumptionByUnit({
        organizationId: ctx.organizationId,
        propertyId: ctx.propertyId,
        kind: definition.meterKind,
        year,
        month,
      });
      if (consumptions.length === 0) throw new Error("NO_METER_CONSUMPTION");
      assertBillConsumptionMatches(sumConsumptions(consumptions), bill?.totalBillConsumptionM3);
      const meters = await this.meters.listMeters({
        organizationId: ctx.organizationId,
        propertyId: ctx.propertyId,
      });
      const activeForKind = meters.filter((m) => m.kind === definition.meterKind && m.active);
      if (activeForKind.length > 0 && consumptions.length < activeForKind.length) {
        throw new Error("INCOMPLETE_METER_READINGS");
      }
      const amounts = splitByMeterConsumption(consumptions, total);
      for (const [unitId, amount] of amounts) {
        const link = partyMap.get(unitId);
        lineData.push({
          unitId,
          partyId: link?.partyId ?? null,
          financeAccountId: link?.accountId ?? null,
          amount,
        });
      }
    } else if (definition.calculationMode === DueCalculationMode.SUPPLIER_LATE_FEE_BILL) {
      const allocationMode =
        bill?.supplierLateFeeAllocationMode ?? definition.supplierLateFeeAllocationMode;
      if (!allocationMode) throw new Error("SUPPLIER_LATE_FEE_MODE_REQUIRED");
      const totalRaw = bill?.totalBillAmount?.replace(",", ".") ?? "";
      if (!totalRaw) throw new Error("TOTAL_BILL_REQUIRED");
      const total = new Prisma.Decimal(totalRaw);
      if (total.lte(0)) throw new Error("AMOUNT_INVALID");

      const policy = await this.repository.getLateFeePolicy(ctx);
      const dueDay = policy?.dueDayOfMonth ?? 1;
      const graceDays = policy?.graceDays ?? 0;
      const delinquentDebts = await this.repository.listDelinquentUnitDebts(ctx, dueDay, graceDays);
      const amounts = allocateSupplierLateFee(allocationMode, total, unitRows, delinquentDebts);

      for (const [unitId, amount] of amounts) {
        if (amount.lte(0)) continue;
        const link = partyMap.get(unitId);
        lineData.push({
          unitId,
          partyId: link?.partyId ?? null,
          financeAccountId: link?.accountId ?? null,
          amount,
          lineKind: DueAccrualLineKind.SUPPLIER_LATE_FEE,
        });
      }
    } else if (definition.calculationMode === DueCalculationMode.ALLOCATED_BILL) {
      const totalRaw = bill?.totalBillAmount?.replace(",", ".") ?? "";
      if (!totalRaw) throw new Error("TOTAL_BILL_REQUIRED");
      const total = new Prisma.Decimal(totalRaw);
      if (total.lte(0)) throw new Error("AMOUNT_INVALID");
      const byShare = splitByShare(unitRows, total);
      const amounts = byShare.size > 0 ? byShare : splitByArea(unitRows, total);
      for (const [unitId, amount] of amounts) {
        if (amount.lte(0)) continue;
        const link = partyMap.get(unitId);
        lineData.push({
          unitId,
          partyId: link?.partyId ?? null,
          financeAccountId: link?.accountId ?? null,
          amount,
        });
      }
    } else if (definition.calculationMode === DueCalculationMode.SHARE_RATIO) {
      const pool = new Prisma.Decimal(definition.fixedAmount ?? 0);
      const amounts = splitByShare(unitRows, pool);
      for (const [unitId, amount] of amounts) {
        if (amount.lte(0)) continue;
        const link = partyMap.get(unitId);
        lineData.push({
          unitId,
          partyId: link?.partyId ?? null,
          financeAccountId: link?.accountId ?? null,
          amount,
        });
      }
    } else {
      for (const unit of units) {
        let amount = new Prisma.Decimal(0);
        if (definition.calculationMode === DueCalculationMode.FIXED) {
          amount = new Prisma.Decimal(definition.fixedAmount ?? 0);
        } else {
          const area = unit.areaM2 ?? new Prisma.Decimal(0);
          amount = area.mul(definition.ratePerM2 ?? 0);
        }
        if (amount.lte(0)) continue;
        const link = partyMap.get(unit.id);
        lineData.push({
          unitId: unit.id,
          partyId: link?.partyId ?? null,
          financeAccountId: link?.accountId ?? null,
          amount,
        });
      }
    }

    return lineData;
  }

  private async resolveBillInputFromAccrualRun(
    ctx: DuesContext,
    run: {
      year: number;
      month: number;
      totalAmount: Prisma.Decimal;
      totalBillAmount: Prisma.Decimal | null;
      totalBillConsumptionM3: Prisma.Decimal | null;
      supplierLateFeeAllocationMode: SupplierLateFeeAllocationMode | null;
      dueDefinition: {
        calculationMode: DueCalculationMode;
        meterKind: import("@siteyonetim/db").MeterKind | null;
      };
    },
  ): Promise<AccrualBillInput | undefined> {
    if (!accrualModeNeedsBillInput(run.dueDefinition.calculationMode)) {
      return undefined;
    }

    const totalBillAmount =
      run.totalBillAmount?.toString() ??
      (run.totalAmount.gt(0) ? run.totalAmount.toString() : null);
    if (!totalBillAmount) {
      return undefined;
    }

    const bill: AccrualBillInput = {
      totalBillAmount,
      supplierLateFeeAllocationMode: run.supplierLateFeeAllocationMode,
    };

    if (
      run.dueDefinition.calculationMode === DueCalculationMode.METER_ALLOCATED_BILL &&
      run.dueDefinition.meterKind
    ) {
      if (run.totalBillConsumptionM3) {
        bill.totalBillConsumptionM3 = run.totalBillConsumptionM3.toString();
      } else {
        const consumptions = await this.meters.getConsumptionByUnit({
          organizationId: ctx.organizationId,
          propertyId: ctx.propertyId,
          kind: run.dueDefinition.meterKind,
          year: run.year,
          month: run.month,
        });
        bill.totalBillConsumptionM3 = sumConsumptions(consumptions).toString();
      }
    }

    return bill;
  }

  private async computeMissingAccrualLines(
    ctx: DuesContext,
    definition: NonNullable<Awaited<ReturnType<DuesRepository["getDefinition"]>>>,
    year: number,
    month: number,
    existingUnitIds: Set<string>,
    preload?: AccrualLinePreload,
    bill?: AccrualBillInput,
  ): Promise<AccrualLineData[]> {
    const lineData = await this.buildAccrualLineData(ctx, definition, year, month, bill, preload);
    return lineData.filter((line) => !existingUnitIds.has(line.unitId));
  }

  async generateAccrual(input: GenerateAccrualInput) {
    await this.assertCtx(input);
    const definition = await this.repository.getDefinition(input, input.dueDefinitionId);
    if (!definition) throw new Error("DEFINITION_NOT_FOUND");

    const period = await this.repository.ensurePeriod(input, input.year, input.month);
    if (period.status !== FinancePeriodStatus.OPEN) throw new Error("PERIOD_CLOSED");

    const lineData = await this.buildAccrualLineData(
      input,
      definition,
      input.year,
      input.month,
      {
        totalBillAmount: input.totalBillAmount,
        totalBillConsumptionM3: input.totalBillConsumptionM3,
        supplierLateFeeAllocationMode:
          input.supplierLateFeeAllocationMode ?? definition.supplierLateFeeAllocationMode,
      },
    );

    if (lineData.length === 0) throw new Error("NO_ACCRUAL_LINES");

    const allocationMode =
      input.supplierLateFeeAllocationMode ?? definition.supplierLateFeeAllocationMode;
    const run = await this.repository.replaceDraftRun(
      input,
      period.id,
      lineData,
      definition.calculationMode === DueCalculationMode.SUPPLIER_LATE_FEE_BILL
        ? {
            supplierLateFeeAllocationMode: allocationMode,
            supplierReference: input.supplierReference ?? null,
          }
        : undefined,
    );
    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "dues.accrual.generate",
      entityType: "DueAccrualRun",
      entityId: run.id,
      metadata: { year: input.year, month: input.month },
    });
    return mapRun(run);
  }

  async recalculateAccrual(input: RecalculateAccrualInput) {
    await this.assertCtx(input);

    const draft = await this.repository.getDraftRun(input, input.runId);
    if (draft) {
      if (draft.financePeriod.status !== FinancePeriodStatus.OPEN) throw new Error("PERIOD_CLOSED");
      const definition = draft.dueDefinition;
      if (definition.calculationMode !== DueCalculationMode.METER_ALLOCATED_BILL) {
        throw new Error("RECALCULATE_METER_BILL_ONLY");
      }

      const lineData = await this.buildAccrualLineData(input, definition, draft.year, draft.month, {
        totalBillAmount: input.totalBillAmount,
        totalBillConsumptionM3: input.totalBillConsumptionM3,
      });
      if (lineData.length === 0) throw new Error("NO_ACCRUAL_LINES");

      const run = await this.repository.replaceDraftRun(
        {
          organizationId: input.organizationId,
          propertyId: input.propertyId,
          dueDefinitionId: draft.dueDefinitionId,
          year: draft.year,
          month: draft.month,
          totalBillAmount: input.totalBillAmount,
          totalBillConsumptionM3: input.totalBillConsumptionM3,
          actorUserId: input.actorUserId,
        },
        draft.financePeriodId,
        lineData,
      );
      await this.audit.record({
        organizationId: input.organizationId,
        userId: input.actorUserId,
        action: "dues.accrual.recalculate",
        entityType: "DueAccrualRun",
        entityId: run.id,
        metadata: { year: draft.year, month: draft.month, total: run.totalAmount.toString(), status: "DRAFT" },
      });
      return mapRun(run);
    }

    const existing = await this.repository.assertRecalculateAllowed(input, input.runId);
    if (existing.financePeriod.status !== FinancePeriodStatus.OPEN) throw new Error("PERIOD_CLOSED");

    const definition = existing.dueDefinition;
    if (definition.calculationMode !== DueCalculationMode.METER_ALLOCATED_BILL) {
      throw new Error("RECALCULATE_METER_BILL_ONLY");
    }

    const lineData = await this.buildAccrualLineData(
      input,
      definition,
      existing.year,
      existing.month,
      {
        totalBillAmount: input.totalBillAmount,
        totalBillConsumptionM3: input.totalBillConsumptionM3,
      },
    );
    if (lineData.length === 0) throw new Error("NO_ACCRUAL_LINES");

    const run = await this.repository.replacePostedRunLines(input, input.runId, lineData);
    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "dues.accrual.recalculate",
      entityType: "DueAccrualRun",
      entityId: run.id,
      metadata: { year: existing.year, month: existing.month, total: run.totalAmount.toString() },
    });
    return mapRun(run);
  }

  async postAccrual(ctx: DuesContext, runId: string) {
    await this.assertCtx(ctx);
    const draft = await this.repository.getDraftRun(ctx, runId);
    if (!draft) throw new Error("RUN_NOT_FOUND");
    if (draft.financePeriod.status !== FinancePeriodStatus.OPEN) throw new Error("PERIOD_CLOSED");

    const existingUnitIds = new Set(draft.lines.map((line) => line.unitId));
    const bill = await this.resolveBillInputFromAccrualRun(ctx, draft);
    const missingLines = await this.computeMissingAccrualLines(
      ctx,
      draft.dueDefinition,
      draft.year,
      draft.month,
      existingUnitIds,
      undefined,
      bill,
    );
    if (missingLines.length > 0) throw new Error("ACCRUAL_INCOMPLETE");

    const run = await this.repository.postRun(ctx, runId);
    await this.audit.record({
      organizationId: ctx.organizationId,
      userId: ctx.actorUserId,
      action: "dues.accrual.post",
      entityType: "DueAccrualRun",
      entityId: run.id,
      metadata: { total: run.totalAmount.toString() },
    });
    return mapRun(run);
  }

  async voidPostedAccrual(ctx: DuesContext, runId: string) {
    await this.assertCtx(ctx);
    await this.repository.assertRecalculateAllowed(ctx, runId);
    const existing = await this.repository.getPostedRun(ctx, runId);
    if (!existing) throw new Error("RUN_NOT_FOUND");
    if (existing.financePeriod.status !== FinancePeriodStatus.OPEN) throw new Error("PERIOD_CLOSED");

    const run = await this.repository.voidPostedRun(ctx, runId);
    await this.audit.record({
      organizationId: ctx.organizationId,
      userId: ctx.actorUserId,
      action: "dues.accrual.void",
      entityType: "DueAccrualRun",
      entityId: run.id,
      metadata: { year: existing.year, month: existing.month },
    });
    return mapRun(run);
  }

  async supplementPostedAccrual(ctx: DuesContext, runId: string) {
    await this.assertCtx(ctx);
    const existing = await this.repository.getPostedRun(ctx, runId);
    if (!existing) throw new Error("RUN_NOT_FOUND");
    if (existing.financePeriod.status !== FinancePeriodStatus.OPEN) throw new Error("PERIOD_CLOSED");
    if (!supportsSupplementAppend(existing.dueDefinition.calculationMode)) {
      throw new Error("SUPPLEMENT_MODE_NOT_SUPPORTED");
    }

    const existingUnitIds = new Set(existing.lines.map((line) => line.unitId));
    const units = await this.repository.getUnitsWithArea(ctx);
    const partyMap = await this.repository.resolvePartyAccountsForUnits(ctx, units);
    const bill = await this.resolveBillInputFromAccrualRun(ctx, existing);
    const missingLines = await this.computeMissingAccrualLines(
      ctx,
      existing.dueDefinition,
      existing.year,
      existing.month,
      existingUnitIds,
      { units, partyMap },
      bill,
    );
    if (missingLines.length === 0) throw new Error("NO_MISSING_UNITS");

    const run = await this.repository.appendPostedRunLines(ctx, runId, missingLines);
    await this.audit.record({
      organizationId: ctx.organizationId,
      userId: ctx.actorUserId,
      action: "dues.accrual.supplement",
      entityType: "DueAccrualRun",
      entityId: run.id,
      metadata: {
        year: existing.year,
        month: existing.month,
        addedLines: missingLines.length,
        addedTotal: missingLines.reduce((sum, line) => sum.add(line.amount), new Prisma.Decimal(0)).toString(),
      },
    });
    return mapRun(run);
  }

  private async resolveMissingAccrualUnits(
    ctx: DuesContext,
    run: { year: number; month: number },
    definition: NonNullable<Awaited<ReturnType<DuesRepository["getDefinition"]>>>,
    accruedUnitIds: Set<string>,
    preload: AccrualLinePreload,
    meterCache: Map<
      string,
      {
        periods: Awaited<ReturnType<MeterServiceContract["getMeterPeriodByUnit"]>>;
        activeMeterUnitIds: Set<string>;
      }
    >,
  ): Promise<AccrualMissingUnitDto[]> {
    const units = preload.units ?? [];
    if (units.length === 0 || accruedUnitIds.size >= units.length) {
      return [];
    }

    let lineDataUnitIds: Set<string> | undefined;
    try {
      const lineData = await this.buildAccrualLineData(ctx, definition, run.year, run.month, undefined, preload);
      lineDataUnitIds = new Set(lineData.map((line) => line.unitId));
    } catch {
      lineDataUnitIds = undefined;
    }

    let meterPeriods: Awaited<ReturnType<MeterServiceContract["getMeterPeriodByUnit"]>> | undefined;
    let activeMeterUnitIds: Set<string> | undefined;

    if (isMeterDefinitionMode(definition.calculationMode) && definition.meterKind) {
      const cacheKey = `${definition.meterKind}-${run.year}-${run.month}`;
      let cached = meterCache.get(cacheKey);
      if (!cached) {
        const [periods, meters] = await Promise.all([
          this.meters.getMeterPeriodByUnit({
            organizationId: ctx.organizationId,
            propertyId: ctx.propertyId,
            kind: definition.meterKind,
            year: run.year,
            month: run.month,
          }),
          this.meters.listMeters({
            organizationId: ctx.organizationId,
            propertyId: ctx.propertyId,
          }),
        ]);
        const activeForKind = meters.filter(
          (meter) => meter.kind === definition.meterKind && meter.active,
        );
        cached = {
          periods,
          activeMeterUnitIds: new Set(activeForKind.map((meter) => meter.unitId)),
        };
        meterCache.set(cacheKey, cached);
      }
      meterPeriods = cached.periods;
      activeMeterUnitIds = cached.activeMeterUnitIds;
    }

    return analyzeMissingAccrualUnits({
      units: units.map((unit) => ({
        id: unit.id,
        code: unit.code,
        areaM2: unit.areaM2,
        shareRatio: unit.shareRatio,
      })),
      accruedUnitIds,
      calculationMode: definition.calculationMode,
      year: run.year,
      month: run.month,
      partyMap: preload.partyMap ?? new Map(),
      lineDataUnitIds,
      meterPeriods,
      activeMeterUnitIds,
    });
  }

  async listAccrualRunCorrections(ctx: DuesContext): Promise<Record<string, AccrualRunCorrectionDto>> {
    await this.assertCtx(ctx);
    const [units, runs, facts, definitions, lateFeePolicy] = await Promise.all([
      this.repository.getUnitsWithArea(ctx),
      this.repository.listRuns(ctx),
      this.repository.getRunCorrectionFacts(ctx),
      this.repository.listDefinitions(ctx),
      this.repository.getLateFeePolicy(ctx),
    ]);

    const lateFeeDefinitionId = lateFeePolicy?.active ? lateFeePolicy.lateFeeDefinitionId : null;
    const defById = new Map(definitions.map((definition) => [definition.id, definition]));
    const totalUnitCount = units.length;
    const partyMap = await this.repository.resolvePartyAccountsForUnits(ctx, units);
    const preload: AccrualLinePreload = { units, partyMap };
    const meterCache = new Map<
      string,
      {
        periods: Awaited<ReturnType<MeterServiceContract["getMeterPeriodByUnit"]>>;
        activeMeterUnitIds: Set<string>;
      }
    >();
    const result: Record<string, AccrualRunCorrectionDto> = {};

    for (const run of runs) {
      const fact = facts.get(run.id);
      if (!fact) continue;

      const accruedUnitCount = fact.accruedUnitIds.size;
      let missingUnits: AccrualMissingUnitDto[] = [];

      if (
        (run.status === DueAccrualStatus.POSTED || run.status === DueAccrualStatus.DRAFT) &&
        accruedUnitCount < totalUnitCount
      ) {
        const definition = defById.get(run.dueDefinitionId);
        if (definition && definition.id === lateFeeDefinitionId) {
          // Gecikme faizi satırları generic tahakkuk hattından değil, applyLateFees'in
          // gecikmiş borç taramasından gelir; borcu olmayan daire gerçek bir eksiklik değildir.
          missingUnits = [];
        } else if (definition) {
          missingUnits = await this.resolveMissingAccrualUnits(
            ctx,
            run,
            definition,
            fact.accruedUnitIds,
            preload,
            meterCache,
          );
        } else {
          missingUnits = units
            .filter((unit) => !fact.accruedUnitIds.has(unit.id))
            .map((unit) => ({
              unitId: unit.id,
              unitCode: unit.code,
              reasons: ["PENDING_IN_RUN" as const],
            }));
        }
      }

      const missingUnitCount = missingUnits.length;

      const isPosted = run.status === DueAccrualStatus.POSTED;
      const isDraft = run.status === DueAccrualStatus.DRAFT;
      const canVoid = isPosted && fact.periodOpen && !fact.hasPayments && !fact.hasLateFees;
      const canPost = isDraft && fact.periodOpen && missingUnitCount === 0;

      let supplementBlockedReason: AccrualRunCorrectionDto["supplementBlockedReason"] = "NONE";
      let canSupplement = false;

      if (!isPosted) {
        supplementBlockedReason = "NOT_POSTED";
      } else if (!fact.periodOpen) {
        supplementBlockedReason = "PERIOD_CLOSED";
      } else if (missingUnitCount === 0) {
        supplementBlockedReason = "NO_MISSING_UNITS";
      } else if (!supportsSupplementAppend(fact.calculationMode)) {
        supplementBlockedReason = "CALCULATION_MODE";
      } else {
        canSupplement = true;
      }

      result[run.id] = {
        runId: run.id,
        canVoid,
        canSupplement,
        canPost,
        hasPayments: fact.hasPayments,
        hasLateFees: fact.hasLateFees,
        missingUnitCount,
        missingUnits,
        accruedUnitCount,
        totalUnitCount,
        supplementBlockedReason,
      };
    }

    return result;
  }

  async getLateFeePolicy(ctx: DuesContext): Promise<DueLateFeePolicyDto | null> {
    await this.assertCtx(ctx);
    const row = await this.repository.getLateFeePolicy(ctx);
    if (!row) return null;
    const now = new Date();
    let effective: Prisma.Decimal | null = null;
    if (row.rateKind === LateFeeRateKind.LEGAL_TCMB) {
      const legal = await this.repository.getLegalInterestRate(now.getFullYear(), now.getMonth() + 1);
      if (legal) effective = monthlyPercentFromAnnual(legal.annualRatePercent);
    }
    return mapPolicyDto(row, effective);
  }

  async upsertLateFeePolicy(input: UpsertLateFeePolicyInput): Promise<DueLateFeePolicyDto> {
    await this.assertCtx(input);
    const rateKind = input.rateKind ?? LateFeeRateKind.CONTRACTUAL;
    const active = input.active;
    let monthlyStored = new Prisma.Decimal(0);
    if (active && rateKind === LateFeeRateKind.CONTRACTUAL) {
      const raw = (input.monthlyRatePercent ?? "").replace(",", ".");
      if (!raw) throw new Error("LATE_FEE_RATE_INVALID");
      monthlyStored = new Prisma.Decimal(raw);
      if (monthlyStored.lt(0)) throw new Error("LATE_FEE_RATE_INVALID");
    } else if (active && rateKind === LateFeeRateKind.LEGAL_TCMB) {
      monthlyStored = new Prisma.Decimal(0);
    }

    const saved = await this.repository.upsertLateFeePolicy(input, {
      rateKind,
      monthlyRatePercent: monthlyStored.toString(),
      graceDays: Math.max(0, input.graceDays),
      dueDayOfMonth: Math.min(28, Math.max(1, input.dueDayOfMonth)),
      active,
    });

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "dues.lateFeePolicy.upsert",
      entityType: "DueLateFeePolicy",
      entityId: saved.id,
      metadata: { rateKind, monthlyRatePercent: monthlyStored.toString() },
    });

    let effective: Prisma.Decimal | null = null;
    if (rateKind === LateFeeRateKind.LEGAL_TCMB) {
      const now = new Date();
      const legal = await this.repository.getLegalInterestRate(now.getFullYear(), now.getMonth() + 1);
      if (legal) effective = monthlyPercentFromAnnual(legal.annualRatePercent);
    }

    return mapPolicyDto(saved, effective);
  }

  private async resolveLateFeeRateMultiplier(
    policy: { rateKind: LateFeeRateKind; monthlyRatePercent: Prisma.Decimal },
    applyYear: number,
    applyMonth: number,
  ): Promise<Prisma.Decimal> {
    if (policy.rateKind === LateFeeRateKind.LEGAL_TCMB) {
      const legal = await this.repository.getLegalInterestRate(applyYear, applyMonth);
      if (!legal) throw new Error("LEGAL_RATE_MISSING");
      return monthlyPercentFromAnnual(legal.annualRatePercent).div(100);
    }
    return policy.monthlyRatePercent.div(100);
  }

  async applyLateFees(input: ApplyLateFeesInput) {
    await this.assertCtx(input);
    const policy = await this.repository.getLateFeePolicy(input);
    if (!policy?.active || !policy?.lateFeeDefinitionId) throw new Error("LATE_FEE_POLICY_MISSING");

    const period = await this.repository.ensurePeriod(input, input.year, input.month);
    if (period.status !== FinancePeriodStatus.OPEN) throw new Error("PERIOD_CLOSED");

    const rate = await this.resolveLateFeeRateMultiplier(policy, input.year, input.month);
    const openLines = await this.repository.listStandardOpenLines(input);
    const feeLines: {
      unitId: string;
      partyId: string | null;
      financeAccountId: string | null;
      amount: Prisma.Decimal;
      sourceLineId: string;
    }[] = [];

    for (const line of openLines) {
      const remaining = line.amount.sub(line.paidAmount);
      if (remaining.lte(0)) continue;

      const overdue = daysOverdue(line.accrualRun.year, line.accrualRun.month, policy.dueDayOfMonth);
      if (overdue <= policy.graceDays) continue;

      const fee = remaining.mul(rate);
      if (fee.lte(0)) continue;

      feeLines.push({
        unitId: line.unit.id,
        partyId: line.partyId,
        financeAccountId: line.financeAccountId,
        amount: fee,
        sourceLineId: line.id,
      });
    }

    const result = await this.repository.appendLateFeeLines(
      input,
      policy.lateFeeDefinitionId,
      period.id,
      input.year,
      input.month,
      feeLines,
    );

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "dues.lateFee.apply",
      entityType: "DueAccrualRun",
      entityId: result.runId ?? undefined,
      metadata: { added: result.added, year: input.year, month: input.month },
    });

    return result;
  }

  async listOpenLines(input: ListOpenLinesInput) {
    await this.assertCtx(input);
    const policy = await this.repository.getLateFeePolicy(input);
    const dueDay = policy?.dueDayOfMonth ?? 1;
    return this.repository.listOpenLinesPaginated({ ...input, dueDay });
  }

  async listPaymentTargets(ctx: DuesContext) {
    await this.assertCtx(ctx);
    const [lines, partyByUnit] = await Promise.all([
      this.repository.listDebtLines(ctx),
      this.repository.getActivePartyMapByUnit(ctx),
    ]);
    return buildPaymentTargets(lines, partyByUnit);
  }

  async getDebtDashboard(ctx: DuesContext): Promise<DebtRowDto[]> {
    await this.assertCtx(ctx);
    const policy = await this.repository.getLateFeePolicy(ctx);
    const dueDay = policy?.dueDayOfMonth ?? 1;
    const lines = await this.repository.listDebtLines(ctx);
    return aggregateDebtRows(lines, dueDay);
  }

  async listDebtRows(input: ListDebtRowsInput): Promise<PaginatedDebtRows> {
    await this.assertCtx(input);
    const policy = await this.repository.getLateFeePolicy(input);
    const dueDay = policy?.dueDayOfMonth ?? 1;
    const { rows, total } = await this.repository.listDebtRowsPaginated({ ...input, dueDay });
    const page = Math.max(1, input.page);
    const pageSize = Math.min(Math.max(input.pageSize, 1), 100);
    return { items: rows, total, page, pageSize };
  }

  async listPeriodRegister(input: ListPeriodRegisterInput): Promise<PeriodRegisterPageDto> {
    await this.assertCtx(input);
    const policy = await this.repository.getLateFeePolicy(input);
    const dueDay = policy?.dueDayOfMonth ?? 1;

    const [definitions, { units, lines, total }, periodDefinitionIds] = await Promise.all([
      this.listDefinitions(input),
      this.repository.listPeriodRegisterPaginated({ ...input, dueDay }),
      this.repository.listPeriodRegisterDefinitionIdsForPeriod(input),
    ]);

    const periodDefinitionIdSet = new Set(periodDefinitionIds);

    const activeColumns = definitions
      .filter((definition) => periodDefinitionIdSet.has(definition.id))
      .map((definition) => ({
        id: definition.id,
        name: definition.name,
        calculationMode: definition.calculationMode,
        supplierLateFeeAllocationMode: definition.supplierLateFeeAllocationMode,
      }));

    const linesByUnit = new Map<string, typeof lines>();
    for (const line of lines) {
      const bucket = linesByUnit.get(line.unitId) ?? [];
      bucket.push(line);
      linesByUnit.set(line.unitId, bucket);
    }

    const rows: PeriodRegisterRowDto[] = units.map((unit) => {
      const unitLines = linesByUnit.get(unit.unitId) ?? [];
      const cells: Record<string, PeriodRegisterCellDto> = {};

      for (const column of activeColumns) {
        const matching = unitLines.filter((line) => line.dueDefinitionId === column.id);
        if (matching.length === 0) {
          cells[column.id] = {
            lineId: null,
            dueDefinitionId: column.id,
            dueDefinitionName: column.name,
            amount: "0",
            paidAmount: "0",
            remaining: "0",
            status: "NONE",
            lineKind: null,
            supplierLateFeeAllocationMode: null,
            supplierReference: null,
            lastDocumentNo: null,
            isOverdue: false,
          };
          continue;
        }

        const amount = matching.reduce((sum, line) => sum + Number(line.amount), 0);
        const paidAmount = matching.reduce((sum, line) => sum + Number(line.paidAmount), 0);
        const remaining = amount - paidAmount;
        const primary =
          matching.find((line) => Number(line.remaining) > 0) ??
          matching.find((line) => line.lineKind === DueAccrualLineKind.STANDARD) ??
          matching[0]!;
        const hasLateFee = matching.some((line) => line.lineKind === DueAccrualLineKind.LATE_FEE);
        const hasSupplierLateFee = matching.some(
          (line) => line.lineKind === DueAccrualLineKind.SUPPLIER_LATE_FEE,
        );
        const supplierMeta = matching.find(
          (line) => line.lineKind === DueAccrualLineKind.SUPPLIER_LATE_FEE,
        );
        const status =
          remaining <= 0 && amount > 0
            ? DueLineStatus.PAID
            : paidAmount > 0 && remaining > 0
              ? DueLineStatus.PARTIAL
              : remaining > 0
                ? DueLineStatus.OPEN
                : "NONE";

        cells[column.id] = {
          lineId: Number(primary.remaining) > 0 ? primary.lineId : null,
          dueDefinitionId: column.id,
          dueDefinitionName: column.name,
          amount: amount.toFixed(2),
          paidAmount: paidAmount.toFixed(2),
          remaining: Math.max(0, remaining).toFixed(2),
          status,
          lineKind: hasLateFee
            ? DueAccrualLineKind.LATE_FEE
            : hasSupplierLateFee
              ? DueAccrualLineKind.SUPPLIER_LATE_FEE
              : primary.lineKind,
          supplierLateFeeAllocationMode: supplierMeta?.supplierLateFeeAllocationMode ?? null,
          supplierReference: supplierMeta?.supplierReference ?? null,
          lastDocumentNo:
            matching
              .map((line) => line.lastDocumentNo)
              .find((documentNo) => documentNo != null && documentNo.length > 0) ?? null,
          isOverdue: matching.some((line) => line.isOverdue),
        };
      }

      return {
        unitId: unit.unitId,
        unitCode: unit.unitCode,
        blockId: unit.blockId,
        blockName: unit.blockName,
        partyId: unit.partyId,
        partyName: unit.partyName,
        periodDebt: unit.periodDebt,
        periodPaid: unit.periodPaid,
        periodRemaining: unit.periodRemaining,
        totalOpenDebt: unit.totalOpenDebt,
        aging0To30: unit.aging0To30,
        aging31To60: unit.aging31To60,
        aging61Plus: unit.aging61Plus,
        cells,
      };
    });

    return {
      period: { year: input.year, month: input.month },
      columns: activeColumns,
      rows,
      total,
      page: Math.max(1, input.page),
      pageSize: Math.min(Math.max(input.pageSize, 1), 100),
    };
  }

  async exportPeriodRegister(input: ExportPeriodRegisterInput): Promise<ExportedPeriodRegisterFile> {
    await this.assertCtx(input);
    const page = await this.listPeriodRegister({
      ...input,
      page: 1,
      pageSize: PERIOD_REGISTER_EXPORT_PAGE_SIZE,
    });
    const periodLabel = `${input.month}/${input.year}`;
    const letterhead = await this.repository.getExportLetterheadMeta(input.organizationId, input.propertyId);
    const document = buildPeriodRegisterDocument(page, periodLabel, {
      locale: input.locale,
      propertyName: letterhead?.propertyName,
      organizationName: letterhead?.organizationName,
      address: letterhead?.address,
    });
    const reportingCore = createReportingCoreService();
    const rendered = await reportingCore.render(input.format, document);

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "dues.periodRegister.export",
      entityType: "Property",
      entityId: input.propertyId,
      metadata: {
        format: input.format,
        year: input.year,
        month: input.month,
        blockId: input.blockId ?? null,
        rowCount: page.rows.length,
        totalRows: page.total,
      },
    });

    return rendered;
  }

  async listDebtOverview(input: ListDebtRowsInput): Promise<DebtOverviewDto> {
    await this.assertCtx(input);
    const [lines, partyByUnit, debtPage] = await Promise.all([
      this.repository.listDebtLines(input),
      this.repository.getActivePartyMapByUnit(input),
      this.listDebtRows(input),
    ]);
    return {
      debtPage,
      paymentTargets: buildPaymentTargets(lines, partyByUnit),
    };
  }

  async getUnitDebtDetail(
    ctx: DuesContext,
    unitId: string,
    period?: { year: number; month: number },
  ): Promise<UnitDebtDetailDto | null> {
    await this.assertCtx(ctx);
    const policy = await this.repository.getLateFeePolicy(ctx);
    const dueDay = policy?.dueDayOfMonth ?? 1;
    const lines = await this.repository.listDebtLines(ctx);
    let row = aggregateDebtRows(lines, dueDay).find((item) => item.unitId === unitId) ?? null;

    if (!row && period) {
      const unitMeta = await this.repository.getUnitDebtDetailMeta(ctx, unitId);
      if (!unitMeta) {
        return null;
      }
      const party = unitMeta.occupancies[0]?.party;
      row = {
        unitId: unitMeta.id,
        unitCode: unitMeta.code,
        blockId: unitMeta.blockId,
        blockName: unitMeta.block?.name ?? null,
        partyId: party?.id ?? null,
        partyName: party?.displayName ?? null,
        totalDebt: "0",
        aging0To30: "0",
        aging31To60: "0",
        aging61Plus: "0",
      };
    }

    if (!row) {
      return null;
    }

    const openLineRows = await this.repository.listOpenLinesByUnit(ctx, unitId);
    const scopedOpenLineRows = period
      ? openLineRows.filter(
          (line) => line.accrualRun.year === period.year && line.accrualRun.month === period.month,
        )
      : openLineRows;
    const openLines = scopedOpenLineRows.map(mapOpenLine);

    let partyId = row.partyId;
    let partyName = row.partyName;
    if (!partyId) {
      const activeParty = await this.repository.getActivePartyByUnit(ctx, unitId);
      partyId = activeParty?.partyId ?? null;
      partyName = activeParty?.partyName ?? partyName;
    }
    if (!partyId) {
      const fromOpenLine = openLines.find((line) => line.partyId);
      partyId = fromOpenLine?.partyId ?? null;
      partyName = fromOpenLine?.partyName ?? partyName;
    }

    const enrichedRow =
      partyId && partyId !== row.partyId
        ? { ...row, partyId, partyName: partyName ?? row.partyName }
        : row;

    let periodSummary: UnitDebtDetailDto["period"];
    let statement: StatementLineDto[];

    if (period) {
      const periodLines = await this.repository.getUnitPeriodAccrualLines(ctx, unitId, period);
      const periodDebt = periodLines.reduce(
        (sum, line) => sum.add(line.amount),
        new Prisma.Decimal(0),
      );
      const periodPaid = periodLines.reduce(
        (sum, line) => sum.add(line.paidAmount),
        new Prisma.Decimal(0),
      );
      periodSummary = {
        year: period.year,
        month: period.month,
        periodDebt: periodDebt.toFixed(2),
        periodPaid: periodPaid.toFixed(2),
        periodRemaining: periodDebt.sub(periodPaid).toFixed(2),
      };
      statement = await this.buildUnitStatementForPeriod(ctx, unitId, period);
    } else {
      statement = partyId ? await this.getPartyStatement(ctx, partyId) : [];
    }

    return { row: enrichedRow, openLines, statement, period: periodSummary };
  }

  async exportUnitDebtDetail(input: ExportUnitDebtDetailInput): Promise<ExportedPeriodRegisterFile> {
    await this.assertCtx(input);
    const detail = await this.getUnitDebtDetail(
      input,
      input.unitId,
      { year: input.year, month: input.month },
    );
    if (!detail) {
      throw new Error("UNIT_NOT_FOUND");
    }

    const periodLabel = `${input.month}/${input.year}`;
    const letterhead = await this.repository.getExportLetterheadMeta(input.organizationId, input.propertyId);
    const unitLabel = detail.row.blockName
      ? `${detail.row.blockName} / ${detail.row.unitCode}`
      : detail.row.unitCode;
    const document = buildUnitDebtDetailDocument(detail, periodLabel, {
      locale: input.locale,
      propertyName: letterhead?.propertyName,
      organizationName: letterhead?.organizationName,
      address: letterhead?.address,
      unitLabel,
      partyName: detail.row.partyName,
    });
    const reportingCore = createReportingCoreService();
    const rendered = await reportingCore.render(input.format, document);

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "dues.unitDebtDetail.export",
      entityType: "Unit",
      entityId: input.unitId,
      metadata: {
        format: input.format,
        year: input.year,
        month: input.month,
        propertyId: input.propertyId,
      },
    });

    return rendered;
  }

  async getAccrualContextWarnings(
    ctx: DuesContext,
    period: { year: number; month: number },
    preload?: AccrualContextPreload,
  ): Promise<AccrualContextWarningsDto> {
    await this.assertCtx(ctx);
    const warnings: AccrualContextWarningDto[] = [];
    const periodFilter = { year: period.year, month: period.month };

    const [definitions, units, runs, runLinesByRunId] = preload
      ? await Promise.all([
          Promise.resolve(preload.definitions),
          this.repository.getUnitsWithArea(ctx),
          Promise.resolve(preload.runs),
          Promise.resolve(preload.runLinesByRunId),
        ])
      : await Promise.all([
          this.listDefinitions(ctx),
          this.repository.getUnitsWithArea(ctx),
          this.listAccrualRuns(ctx),
          this.listAccrualRunLinesByProperty(ctx),
        ]);

    if (definitions.length === 0) {
      warnings.push({ code: "NO_DEFINITIONS", severity: "error" });
    }
    if (units.length === 0) {
      warnings.push({ code: "NO_UNITS", severity: "error" });
    }

    const partyByUnit = await this.repository.getActivePartyMapByUnit(ctx);
    const unitsWithoutOccupancy = Math.max(0, units.length - partyByUnit.size);
    if (units.length > 0 && unitsWithoutOccupancy > 0) {
      warnings.push({
        code: "UNITS_WITHOUT_OCCUPANCY",
        severity: "warning",
        count: unitsWithoutOccupancy,
      });
    }

    const draftRuns = runs.filter(
      (run) => run.year === period.year && run.month === period.month && run.status === DueAccrualStatus.DRAFT,
    );
    if (draftRuns.length > 0) {
      warnings.push({
        code: "DRAFT_ACCRUAL_PENDING",
        severity: "warning",
        count: draftRuns.length,
        period: periodFilter,
      });
    }

    const runCorrections =
      preload?.runCorrections ?? (await this.listAccrualRunCorrections(ctx));
    for (const run of runs.filter(
      (item) => item.year === period.year && item.month === period.month && item.status === DueAccrualStatus.POSTED,
    )) {
      const correction = runCorrections[run.id];
      if (correction && correction.missingUnitCount > 0) {
        warnings.push({
          code: "POSTED_ACCRUAL_INCOMPLETE",
          severity: "warning",
          count: correction.missingUnitCount,
          runId: run.id,
          period: periodFilter,
        });
      }
    }

    for (const definition of definitions.filter((item) => isMeterDefinitionMode(item.calculationMode))) {
      if (!definition.meterKind) continue;

      const [consumptions, meters, periods] = await Promise.all([
        this.meters.getConsumptionByUnit({
          organizationId: ctx.organizationId,
          propertyId: ctx.propertyId,
          kind: definition.meterKind,
          year: period.year,
          month: period.month,
        }),
        this.meters.listMeters({
          organizationId: ctx.organizationId,
          propertyId: ctx.propertyId,
        }),
        this.meters.getMeterPeriodByUnit({
          organizationId: ctx.organizationId,
          propertyId: ctx.propertyId,
          kind: definition.meterKind,
          year: period.year,
          month: period.month,
        }),
      ]);

      const activeForKind = meters.filter((meter) => meter.kind === definition.meterKind && meter.active);
      if (activeForKind.length > 0 && consumptions.length === 0) {
        warnings.push({
          code: "NO_METER_CONSUMPTION",
          severity: "warning",
          meterKind: definition.meterKind,
          definitionId: definition.id,
          period: periodFilter,
        });
      }
      if (activeForKind.length > 0 && consumptions.length < activeForKind.length) {
        warnings.push({
          code: "INCOMPLETE_METER_READINGS",
          severity: "warning",
          count: activeForKind.length - consumptions.length,
          meterKind: definition.meterKind,
          definitionId: definition.id,
          period: periodFilter,
        });
      }

      const missingPreviousIndex = periods.filter(
        (item) => item.currentIndex != null && item.previousIndex == null,
      ).length;
      if (missingPreviousIndex > 0) {
        warnings.push({
          code: "MISSING_PREVIOUS_MONTH_INDEX",
          severity: "warning",
          count: missingPreviousIndex,
          meterKind: definition.meterKind,
          period: periodFilter,
        });
      }
    }

    for (const run of runs.filter((item) => item.year === period.year && item.month === period.month)) {
      const lines = runLinesByRunId[run.id] ?? [];
      if (needsConsumptionRecalculate(run, lines)) {
        warnings.push({
          code: "METER_AMOUNT_MISMATCH",
          severity: "warning",
          runId: run.id,
          period: periodFilter,
        });
      }
      if (hasMeterRunMismatch(run, lines)) {
        warnings.push({
          code: "METER_RUN_MISMATCH",
          severity: "warning",
          runId: run.id,
          period: periodFilter,
        });
      }
      const missingPrevious = countMissingPreviousIndex(lines);
      if (missingPrevious > 0 && run.meterKind) {
        warnings.push({
          code: "MISSING_PREVIOUS_MONTH_INDEX",
          severity: "warning",
          count: missingPrevious,
          meterKind: run.meterKind,
          runId: run.id,
          period: periodFilter,
        });
      }
    }

    const blockingCodes: AccrualContextWarningsDto["blockingCodes"] = ["NO_DEFINITIONS", "NO_UNITS"];
    const canGenerateAccrual = !warnings.some((warning) => blockingCodes.includes(warning.code));

    return {
      propertyId: ctx.propertyId,
      period: periodFilter,
      warnings,
      canGenerateAccrual,
      blockingCodes,
    };
  }

  async recordPayment(input: RecordPaymentInput) {
    await this.assertCtx(input);
    const amount = new Prisma.Decimal(input.amount.replace(",", "."));
    if (amount.lte(0)) throw new Error("AMOUNT_INVALID");

    const allowAdvance = input.allowAdvance !== false;
    let allocations = input.allocations ?? [];
    const manualAllocations = allocations.length > 0 && input.autoAllocate === false;

    if (manualAllocations) {
      let left = amount;
      const adjusted: PaymentAllocationInput[] = [];
      for (const alloc of allocations) {
        if (left.lte(0)) break;
        const cap = new Prisma.Decimal(alloc.amount.replace(",", "."));
        const slice = minDecimal(left, cap);
        if (slice.lte(0)) continue;
        adjusted.push({ dueAccrualLineId: alloc.dueAccrualLineId, amount: slice.toString() });
        left = left.sub(slice);
      }
      if (adjusted.length === 0) {
        throw new Error("ALLOCATION_SUM_MISMATCH");
      }
      if (left.gt(0) && !allowAdvance) {
        throw new Error("UNALLOCATED_AMOUNT");
      }
      allocations = adjusted;
    } else if (input.autoAllocate || allocations.length === 0) {
      const openLines = await this.repository.fetchOpenLinesForParty(
        input,
        input.partyId,
        input.unitId ?? null,
      );
      let left = amount;
      allocations = [];
      for (const line of openLines) {
        if (left.lte(0)) break;
        const remaining = line.amount.sub(line.paidAmount);
        const slice = minDecimal(left, remaining);
        if (slice.lte(0)) continue;
        allocations.push({ dueAccrualLineId: line.id, amount: slice.toString() });
        left = left.sub(slice);
      }
      if (left.gt(0) && !allowAdvance) {
        throw new Error("UNALLOCATED_AMOUNT");
      }
    }

    const allocatedSum = allocations.reduce(
      (acc, a) => acc.add(new Prisma.Decimal(a.amount.replace(",", "."))),
      new Prisma.Decimal(0),
    );

    const allowPartial = (!manualAllocations && allowAdvance) || (manualAllocations && allowAdvance);
    const payment = await this.repository.recordPaymentTx(input, allocations, amount, allowPartial);
    const advanceAmount = amount.sub(allocatedSum);

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "dues.payment.record",
      entityType: "Payment",
      entityId: payment.id,
      metadata: {
        amount: amount.toString(),
        allocated: allocatedSum.toString(),
        advance: advanceAmount.gt(0) ? advanceAmount.toString() : "0",
        unitId: input.unitId ?? null,
      },
    });
    return {
      paymentId: payment.id,
      allocatedAmount: allocatedSum.toString(),
      advanceAmount: advanceAmount.gt(0) ? advanceAmount.toString() : "0",
    };
  }

  async getPartyStatement(ctx: DuesContext, partyId: string): Promise<StatementLineDto[]> {
    await this.assertCtx(ctx);
    const party = await this.repository.findPartyById(partyId, ctx.organizationId);
    if (!party) return [];
    return this.buildStatement(ctx, partyId);
  }

  async getPortalStatement(userId: string): Promise<StatementLineDto[]> {
    const party = await this.repository.findPartyByPortalUser(userId);
    if (!party) return [];

    const propertyId = await this.repository.resolvePropertyForParty(party.id);
    if (!propertyId) return [];

    return this.buildStatement({ organizationId: party.organizationId, propertyId }, party.id);
  }

  async getPortalOpenDebt(userId: string): Promise<string> {
    const party = await this.repository.findPartyByPortalUser(userId);
    if (!party) return "0";
    const total = await this.repository.sumOpenDebtForParty(party.id);
    return total.toString();
  }

  async getPortalOpenDebtForUnit(propertyId: string, unitId: string): Promise<string> {
    const total = await this.repository.sumOpenDebtForUnit(propertyId, unitId);
    return total.toString();
  }

  async getPortalOpenDebtForPartyProperty(
    partyId: string,
    propertyId: string,
    unitId?: string | null,
  ): Promise<string> {
    const total = await this.repository.sumOpenDebtForPartyProperty(partyId, propertyId, unitId ?? null);
    return total.toString();
  }

  async getPortalOpenDebtLines(userId: string): Promise<PortalOpenDebtLineDto[]> {
    const party = await this.repository.findPartyByPortalUser(userId);
    if (!party) return [];

    const lines = await this.repository.listPortalOpenLinesForParty(party.id);
    return lines
      .map(mapPortalOpenDebtLine)
      .filter((line) => Number(line.remaining) > 0);
  }

  async getPortalOpenDebtLinesForUnit(
    propertyId: string,
    unitId: string,
  ): Promise<PortalOpenDebtLineDto[]> {
    const lines = await this.repository.listPortalOpenLinesForUnit(propertyId, unitId);
    return lines
      .map(mapPortalOpenDebtLine)
      .filter((line) => Number(line.remaining) > 0);
  }

  async getPortalStatementForUnit(propertyId: string, unitId: string): Promise<StatementLineDto[]> {
    const property = await this.repository.findPropertyScope(propertyId);
    if (!property) return [];
    return this.buildUnitStatement(
      { organizationId: property.organizationId, propertyId },
      unitId,
    );
  }

  async getPortalMemberDebtSummary(
    input: PortalMemberDebtSummaryInput,
  ): Promise<PortalMemberDebtSummaryDto> {
    const ctx = { organizationId: input.organizationId, propertyId: input.propertyId };
    const property = await this.repository.findPropertyScope(input.propertyId);
    if (!property) {
      return {
        propertyId: input.propertyId,
        propertyName: "",
        rows: [],
        totalDebt: "0",
      };
    }

    const exclude = new Set(input.excludeUnitIds ?? []);
    const dashboard = await this.getDebtDashboard(ctx);
    const rows = dashboard
      .filter((row) => !exclude.has(row.unitId) && Number(row.totalDebt) > 0)
      .map((row) => ({
        unitId: row.unitId,
        unitCode: row.unitCode,
        blockName: row.blockName,
        totalDebt: row.totalDebt,
        aging0To30: row.aging0To30,
        aging31To60: row.aging31To60,
        aging61Plus: row.aging61Plus,
      }))
      .sort((a, b) => Number(b.totalDebt) - Number(a.totalDebt));

    const totalDebt = rows.reduce(
      (sum, row) => sum.add(new Prisma.Decimal(row.totalDebt)),
      new Prisma.Decimal(0),
    );

    return {
      propertyId: input.propertyId,
      propertyName: property.name,
      rows,
      totalDebt: totalDebt.toString(),
    };
  }

  private async buildUnitStatementForPeriod(
    ctx: DuesContext,
    unitId: string,
    period: { year: number; month: number },
  ): Promise<StatementLineDto[]> {
    const { lines, payments } = await this.repository.getUnitStatementDataForPeriod(ctx, unitId, period);
    type Event = { date: Date; sort: number; line: StatementLineDto };
    const events: Event[] = [];

    for (const line of lines) {
      events.push({
        date: line.createdAt,
        sort: 1,
        line: {
          kind: "ACCRUAL",
          date: line.createdAt,
          label: formatStatementAccrualLabel(line),
          debit: line.amount.toString(),
          credit: "0",
          balance: "0",
        },
      });
    }

    for (const payment of payments) {
      const allocated = payment.allocations.reduce(
        (acc, allocation) => acc.add(allocation.amount),
        new Prisma.Decimal(0),
      );
      if (allocated.lte(0)) continue;
      events.push({
        date: payment.paymentDate,
        sort: 2,
        line: {
          kind: "PAYMENT",
          date: payment.paymentDate,
          label: formatStatementPaymentLabel(payment),
          debit: "0",
          credit: allocated.toString(),
          balance: "0",
        },
      });
    }

    events.sort((a, b) => a.date.getTime() - b.date.getTime() || a.sort - b.sort);

    let balance = new Prisma.Decimal(0);
    return events.map((event) => {
      balance = balance.add(event.line.debit).sub(event.line.credit);
      return { ...event.line, balance: balance.toString() };
    });
  }

  private async buildUnitStatement(ctx: DuesContext, unitId: string): Promise<StatementLineDto[]> {
    const since = new Date();
    since.setMonth(since.getMonth() - 12);

    const { lines, payments } = await this.repository.getUnitStatementData(ctx, unitId, since);
    type Event = { date: Date; sort: number; line: StatementLineDto };
    const events: Event[] = [];

    for (const line of lines) {
      events.push({
        date: line.createdAt,
        sort: 1,
        line: {
          kind: "ACCRUAL",
          date: line.createdAt,
          label: formatStatementAccrualLabel(line),
          debit: line.amount.toString(),
          credit: "0",
          balance: "0",
        },
      });
    }

    for (const payment of payments) {
      const allocated = payment.allocations.reduce(
        (acc, a) => acc.add(a.amount),
        new Prisma.Decimal(0),
      );
      if (allocated.lte(0)) continue;
      events.push({
        date: payment.paymentDate,
        sort: 2,
        line: {
          kind: "PAYMENT",
          date: payment.paymentDate,
          label: formatStatementPaymentLabel(payment),
          debit: "0",
          credit: allocated.toString(),
          balance: "0",
        },
      });
    }

    events.sort((a, b) => a.date.getTime() - b.date.getTime() || a.sort - b.sort);

    let balance = new Prisma.Decimal(0);
    return events.map((event) => {
      balance = balance.add(event.line.debit).sub(event.line.credit);
      return { ...event.line, balance: balance.toString() };
    });
  }

  private async buildStatement(ctx: DuesContext, partyId: string): Promise<StatementLineDto[]> {
    const since = new Date();
    since.setMonth(since.getMonth() - 12);

    const { lines, payments } = await this.repository.getPartyStatementData(ctx, partyId, since);
    type Event = { date: Date; sort: number; line: StatementLineDto };
    const events: Event[] = [];

    for (const line of lines) {
      events.push({
        date: line.createdAt,
        sort: 1,
        line: {
          kind: "ACCRUAL",
          date: line.createdAt,
          label: formatStatementAccrualLabel(line),
          debit: line.amount.toString(),
          credit: "0",
          balance: "0",
        },
      });
    }
    for (const p of payments) {
      events.push({
        date: p.paymentDate,
        sort: 2,
        line: {
          kind: "PAYMENT",
          date: p.paymentDate,
          label: formatStatementPaymentLabel(p),
          debit: "0",
          credit: p.amount.toString(),
          balance: "0",
        },
      });
    }

    events.sort((a, b) => a.date.getTime() - b.date.getTime() || a.sort - b.sort);
    let balance = new Prisma.Decimal(0);
    return events.map((e) => {
      balance = balance.add(new Prisma.Decimal(e.line.debit)).sub(new Prisma.Decimal(e.line.credit));
      return { ...e.line, balance: balance.toString() };
    });
  }

  async listActiveLateFeePolicyTargets(): Promise<LateFeePolicyTargetDto[]> {
    const rows = await this.repository.listActiveLateFeePolicyTargets();
    return rows.map((r) => ({
      organizationId: r.organizationId,
      propertyId: r.propertyId,
      rateKind: r.rateKind,
    }));
  }

  async listLegalInterestRates(year: number): Promise<LegalInterestRateDto[]> {
    const rows = await this.repository.listLegalInterestRates(year);
    return rows.map((r) => ({
      id: r.id,
      year: r.year,
      month: r.month,
      annualRatePercent: r.annualRatePercent.toString(),
      notes: r.notes,
    }));
  }

  async listLegalInterestYears(): Promise<number[]> {
    return this.repository.listLegalInterestYears();
  }

  async upsertLegalInterestRate(input: UpsertLegalInterestRateInput): Promise<LegalInterestRateDto> {
    const rate = new Prisma.Decimal(input.annualRatePercent.replace(",", "."));
    if (rate.lt(0)) throw new Error("LEGAL_RATE_INVALID");
    if (input.month < 1 || input.month > 12) throw new Error("LEGAL_RATE_INVALID");

    const saved = await this.repository.upsertLegalInterestRate({
      year: input.year,
      month: input.month,
      annualRatePercent: rate,
      notes: input.notes ?? null,
    });

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "dues.legalInterestRate.upsert",
      entityType: "LegalInterestRate",
      entityId: saved.id,
      metadata: { year: input.year, month: input.month, annualRatePercent: rate.toString() },
    });

    return {
      id: saved.id,
      year: saved.year,
      month: saved.month,
      annualRatePercent: saved.annualRatePercent.toString(),
      notes: saved.notes,
    };
  }
}

export function createDuesService(): DuesService {
  return new DuesService();
}
