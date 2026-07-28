import { DueCalculationMode, FinancePeriodStatus, Prisma } from "@siteyonetim/db";
import { createAuditService } from "@siteyonetim/platform-audit";

import type {
  CreateDueDefinitionInput,
  DebtRowDto,
  DueAccrualLineDto,
  DueAccrualRunDto,
  DueDefinitionDto,
  DuesContext,
  DuesServiceContract,
  GenerateAccrualInput,
  RecordPaymentInput,
  StatementLineDto,
} from "./contract";
import { DuesRepository } from "./repository";

function mapDefinition(d: {
  id: string;
  name: string;
  calculationMode: DueCalculationMode;
  fixedAmount: Prisma.Decimal | null;
  ratePerM2: Prisma.Decimal | null;
  active: boolean;
}): DueDefinitionDto {
  return {
    id: d.id,
    name: d.name,
    calculationMode: d.calculationMode,
    fixedAmount: d.fixedAmount?.toString() ?? null,
    ratePerM2: d.ratePerM2?.toString() ?? null,
    active: d.active,
  };
}

function mapRun(r: {
  id: string;
  year: number;
  month: number;
  status: import("@siteyonetim/db").DueAccrualStatus;
  totalAmount: Prisma.Decimal;
  dueDefinition: { name: string };
  _count: { lines: number };
}): DueAccrualRunDto {
  return {
    id: r.id,
    dueDefinitionName: r.dueDefinition.name,
    year: r.year,
    month: r.month,
    status: r.status,
    totalAmount: r.totalAmount.toString(),
    lineCount: r._count.lines,
  };
}

function daysOverdue(year: number, month: number, now = new Date()) {
  const due = new Date(year, month, 0);
  const diff = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function minDecimal(a: Prisma.Decimal, b: Prisma.Decimal) {
  return a.lt(b) ? a : b;
}

export class DuesService implements DuesServiceContract {
  constructor(
    private readonly repository = new DuesRepository(),
    private readonly audit = createAuditService(),
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
    const name = input.name.trim();
    if (!name) throw new Error("DEFINITION_NAME_REQUIRED");

    if (input.calculationMode === DueCalculationMode.FIXED && !input.fixedAmount) {
      throw new Error("FIXED_AMOUNT_REQUIRED");
    }
    if (input.calculationMode === DueCalculationMode.AREA_M2 && !input.ratePerM2) {
      throw new Error("RATE_REQUIRED");
    }

    const created = await this.repository.createDefinition({ ...input, name });
    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "dues.definition.create",
      entityType: "DueDefinition",
      entityId: created.id,
      metadata: { name },
    });
    return mapDefinition(created);
  }

  async listAccrualRuns(ctx: DuesContext) {
    await this.assertCtx(ctx);
    const rows = await this.repository.listRuns(ctx);
    return rows.map(mapRun);
  }

  async generateAccrual(input: GenerateAccrualInput) {
    await this.assertCtx(input);
    const definition = await this.repository.getDefinition(input, input.dueDefinitionId);
    if (!definition) throw new Error("DEFINITION_NOT_FOUND");

    const period = await this.repository.ensurePeriod(input, input.year, input.month);
    if (period.status !== FinancePeriodStatus.OPEN) throw new Error("PERIOD_CLOSED");

    const units = await this.repository.getUnitsWithArea(input);
    if (units.length === 0) throw new Error("NO_UNITS");

    const partyMap = await this.repository.resolvePartyAccountsForUnits(input, units);
    const lineData: {
      unitId: string;
      partyId: string | null;
      financeAccountId: string | null;
      amount: Prisma.Decimal;
    }[] = [];

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

    if (lineData.length === 0) throw new Error("NO_ACCRUAL_LINES");

    const run = await this.repository.replaceDraftRun(input, period.id, lineData);
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

  async postAccrual(ctx: DuesContext, runId: string) {
    await this.assertCtx(ctx);
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

  async listOpenLines(ctx: DuesContext, page: number, pageSize: number) {
    await this.assertCtx(ctx);
    const { rows, total } = await this.repository.listOpenLines(ctx, (page - 1) * pageSize, pageSize);
    const items: DueAccrualLineDto[] = rows.map((r) => {
      const remaining = r.amount.sub(r.paidAmount);
      return {
        id: r.id,
        unitCode: r.unit.code,
        partyName: r.party?.displayName ?? null,
        amount: r.amount.toString(),
        paidAmount: r.paidAmount.toString(),
        remaining: remaining.toString(),
        status: r.status,
        year: r.accrualRun.year,
        month: r.accrualRun.month,
      };
    });
    return { items, total };
  }

  async getDebtDashboard(ctx: DuesContext): Promise<DebtRowDto[]> {
    await this.assertCtx(ctx);
    const lines = await this.repository.listDebtLines(ctx);
    const byUnit = new Map<
      string,
      DebtRowDto & { _b0: Prisma.Decimal; _b1: Prisma.Decimal; _b2: Prisma.Decimal }
    >();

    for (const line of lines) {
      const remaining = line.amount.sub(line.paidAmount);
      if (remaining.lte(0)) continue;

      const overdue = daysOverdue(line.accrualRun.year, line.accrualRun.month);
      let bucket0 = new Prisma.Decimal(0);
      let bucket1 = new Prisma.Decimal(0);
      let bucket2 = new Prisma.Decimal(0);
      if (overdue <= 30) bucket0 = remaining;
      else if (overdue <= 60) bucket1 = remaining;
      else bucket2 = remaining;

      const key = line.unit.id;
      const existing = byUnit.get(key);
      if (!existing) {
        byUnit.set(key, {
          unitId: line.unit.id,
          unitCode: line.unit.code,
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

    return [...byUnit.values()].map(({ _b0, _b1, _b2, ...row }) => row);
  }

  async recordPayment(input: RecordPaymentInput) {
    await this.assertCtx(input);
    const amount = new Prisma.Decimal(input.amount.replace(",", "."));
    if (amount.lte(0)) throw new Error("AMOUNT_INVALID");

    let allocations = input.allocations ?? [];
    if (input.autoAllocate || allocations.length === 0) {
      const openLines = await this.repository.fetchOpenLinesForParty(input, input.partyId);
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
      if (left.gt(0)) throw new Error("UNALLOCATED_AMOUNT");
    }

    const payment = await this.repository.recordPaymentTx(input, allocations, amount);
    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "dues.payment.record",
      entityType: "Payment",
      entityId: payment.id,
      metadata: { amount: amount.toString() },
    });
    return { paymentId: payment.id };
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

    return this.buildStatement(
      { organizationId: party.organizationId, propertyId },
      party.id,
    );
  }

  async getPortalOpenDebt(userId: string): Promise<string> {
    const party = await this.repository.findPartyByPortalUser(userId);
    if (!party) return "0";
    const total = await this.repository.sumOpenDebtForParty(party.id);
    return total.toString();
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
          label: `Aidat ${line.accrualRun.month}/${line.accrualRun.year} — ${line.unit.code}`,
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
          label: p.description ?? "Tahsilat",
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
}

export function createDuesService(): DuesService {
  return new DuesService();
}
