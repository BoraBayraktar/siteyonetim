import { FinanceCategoryType, FinancePeriodStatus, LedgerEntryType, Prisma } from "@siteyonetim/db";
import { createAuditService } from "@siteyonetim/platform-audit";

import type {
  CreateAccountInput,
  CreateCashboxInput,
  CreateCategoryInput,
  CreateLedgerEntryInput,
  FinanceContext,
  FinanceServiceContract,
  ListLedgerInput,
  OperatingBudgetDto,
  SaveOperatingBudgetInput,
} from "./contract";
import { FinanceRepository } from "./repository";
import { FinanceScopeRepository } from "./scope.repository";

const DEFAULT_CATEGORIES: { name: string; type: FinanceCategoryType }[] = [
  { name: "Aidat dışı gelir", type: FinanceCategoryType.INCOME },
  { name: "Ortak alan geliri", type: FinanceCategoryType.INCOME },
  { name: "Genel gider", type: FinanceCategoryType.EXPENSE },
  { name: "Elektrik / su", type: FinanceCategoryType.EXPENSE },
  { name: "Temizlik", type: FinanceCategoryType.EXPENSE },
  { name: "Bakım onarım", type: FinanceCategoryType.EXPENSE },
];

function parseAmount(raw: string): Prisma.Decimal {
  const normalized = raw.replace(",", ".").trim();
  const value = new Prisma.Decimal(normalized);
  if (value.lte(0)) {
    throw new Error("AMOUNT_INVALID");
  }
  return value;
}

function mapPeriod(p: { id: string; year: number; month: number; status: import("@siteyonetim/db").FinancePeriodStatus }) {
  return { id: p.id, year: p.year, month: p.month, status: p.status };
}

export class FinanceService implements FinanceServiceContract {
  constructor(
    private readonly repository = new FinanceRepository(),
    private readonly scope = new FinanceScopeRepository(),
    private readonly audit = createAuditService(),
  ) {}

  async ensureOpenPeriod(ctx: FinanceContext, date = new Date()) {
    const allowed = await this.scope.assertProperty(ctx.organizationId, ctx.propertyId);
    if (!allowed) {
      throw new Error("PROPERTY_NOT_FOUND");
    }

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const period = await this.repository.getOrCreatePeriod(ctx, year, month);
    if (!period) {
      throw new Error("PROPERTY_NOT_FOUND");
    }

    const existingCategories = await this.repository.listCategories(ctx);
    if (existingCategories.length === 0) {
      await Promise.all(
        DEFAULT_CATEGORIES.map((c) =>
          this.repository.createCategory({
            ...ctx,
            name: c.name,
            type: c.type,
          }),
        ),
      );
    }

    return mapPeriod(period);
  }

  async listCategories(ctx: FinanceContext) {
    const rows = await this.repository.listCategories(ctx);
    return rows.map((c) => ({ id: c.id, name: c.name, type: c.type }));
  }

  async createCategory(input: CreateCategoryInput) {
    const name = input.name.trim();
    if (!name) throw new Error("CATEGORY_NAME_REQUIRED");

    const created = await this.repository.createCategory({ ...input, name });
    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "finance.category.create",
      entityType: "FinanceCategory",
      entityId: created.id,
      metadata: { name, type: input.type },
    });
    return { id: created.id, name: created.name, type: created.type };
  }

  async listAccounts(ctx: FinanceContext, page: number, pageSize: number) {
    const { items, total } = await this.repository.listAccounts(
      ctx,
      (page - 1) * pageSize,
      pageSize,
    );
    return {
      total,
      items: items.map((a) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        kind: a.kind,
        balance: a.balance.toString(),
        partyId: a.partyId,
      })),
    };
  }

  async createAccount(input: CreateAccountInput) {
    const code = input.code.trim();
    const name = input.name.trim();
    if (!code || !name) throw new Error("ACCOUNT_FIELDS_REQUIRED");

    const created = await this.repository.createAccount({ ...input, code, name });
    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "finance.account.create",
      entityType: "FinanceAccount",
      entityId: created.id,
      metadata: { code, kind: input.kind },
    });
    return {
      id: created.id,
      code: created.code,
      name: created.name,
      kind: created.kind,
      balance: created.balance.toString(),
      partyId: created.partyId,
    };
  }

  async listCashboxes(ctx: FinanceContext) {
    const rows = await this.repository.listCashboxes(ctx);
    return rows.map((c) => ({ id: c.id, name: c.name, balance: c.balance.toString() }));
  }

  async createCashbox(input: CreateCashboxInput) {
    const name = input.name.trim();
    if (!name) throw new Error("CASHBOX_NAME_REQUIRED");

    const created = await this.repository.createCashbox({ ...input, name });
    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "finance.cashbox.create",
      entityType: "Cashbox",
      entityId: created.id,
      metadata: { name },
    });
    return { id: created.id, name: created.name, balance: created.balance.toString() };
  }

  async listLedger(input: ListLedgerInput) {
    const { rows, total } = await this.repository.listLedger(input);
    return {
      items: rows.map((e) => ({
        id: e.id,
        entryType: e.entryType,
        amount: e.amount.toString(),
        documentNo: e.documentNo,
        description: e.description,
        entryDate: e.entryDate,
        categoryName: e.category.name,
        cashboxName: e.cashbox?.name ?? null,
        accountName: e.financeAccount?.name ?? null,
      })),
      total,
      page: input.page,
      pageSize: input.pageSize,
    };
  }

  async createLedgerEntry(input: CreateLedgerEntryInput) {
    const amount = parseAmount(input.amount);
    const entryDate = input.entryDate ?? new Date();
    const period = await this.ensureOpenPeriod(input, entryDate);
    if (period.status !== FinancePeriodStatus.OPEN) {
      throw new Error("PERIOD_CLOSED");
    }

    const categories = await this.repository.listCategories(input);
    const category = categories.find((c) => c.id === input.categoryId);
    if (!category) {
      throw new Error("CATEGORY_NOT_FOUND");
    }
    const expectedType =
      input.entryType === LedgerEntryType.INCOME
        ? FinanceCategoryType.INCOME
        : FinanceCategoryType.EXPENSE;
    if (category.type !== expectedType) {
      throw new Error("CATEGORY_TYPE_MISMATCH");
    }

    if (!input.cashboxId && !input.financeAccountId) {
      throw new Error("LEDGER_TARGET_REQUIRED");
    }

    const entry = await this.repository.createLedgerEntryTx(input, period.id, amount);

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "finance.ledger.create",
      entityType: "LedgerEntry",
      entityId: entry.id,
      metadata: {
        entryType: input.entryType,
        amount: amount.toString(),
      },
    });

    return {
      id: entry.id,
      entryType: entry.entryType,
      amount: entry.amount.toString(),
      documentNo: entry.documentNo,
      description: entry.description,
      entryDate: entry.entryDate,
      categoryName: entry.category.name,
      cashboxName: entry.cashbox?.name ?? null,
      accountName: entry.financeAccount?.name ?? null,
    };
  }

  async closePeriod(ctx: FinanceContext, periodId: string) {
    const period = await this.repository.findPeriodById(ctx, periodId);
    if (!period) {
      throw new Error("PERIOD_NOT_FOUND");
    }
    if (period.status !== "OPEN") {
      throw new Error("PERIOD_ALREADY_CLOSED");
    }
    const closed = await this.repository.closePeriod(periodId);
    await this.audit.record({
      organizationId: ctx.organizationId,
      userId: ctx.actorUserId,
      action: "finance.period.close",
      entityType: "FinancePeriod",
      entityId: closed.id,
      metadata: { year: closed.year, month: closed.month },
    });
    return mapPeriod(closed);
  }

  private mapOperatingBudget(
    budget: {
      id: string;
      year: number;
      notes: string | null;
      lines: Array<{
        categoryId: string;
        plannedAmount: Prisma.Decimal;
        category: { id: string; name: string; type: import("@siteyonetim/db").FinanceCategoryType };
      }>;
    },
    actualByCategory: Map<string, Prisma.Decimal>,
  ): OperatingBudgetDto {
    let totalPlanned = new Prisma.Decimal(0);
    let totalActual = new Prisma.Decimal(0);
    const lines = budget.lines.map((line) => {
      totalPlanned = totalPlanned.add(line.plannedAmount);
      const actual = actualByCategory.get(line.categoryId) ?? new Prisma.Decimal(0);
      totalActual = totalActual.add(actual);
      return {
        categoryId: line.categoryId,
        categoryName: line.category.name,
        categoryType: line.category.type,
        plannedAmount: line.plannedAmount.toString(),
        actualAmount: actual.toString(),
      };
    });
    return {
      id: budget.id,
      year: budget.year,
      notes: budget.notes,
      lines,
      totalPlanned: totalPlanned.toString(),
      totalActual: totalActual.toString(),
    };
  }

  private actualAmountsByCategory(
    totals: Array<{ categoryId: string; amount: Prisma.Decimal }>,
  ) {
    const map = new Map<string, Prisma.Decimal>();
    for (const row of totals) {
      const current = map.get(row.categoryId) ?? new Prisma.Decimal(0);
      map.set(row.categoryId, current.add(row.amount));
    }
    return map;
  }

  async getOperatingBudget(ctx: FinanceContext, year: number): Promise<OperatingBudgetDto | null> {
    const allowed = await this.scope.assertProperty(ctx.organizationId, ctx.propertyId);
    if (!allowed) throw new Error("PROPERTY_NOT_FOUND");

    const budget = await this.repository.findOperatingBudget(ctx, year);
    if (!budget) return null;

    const totals = await this.repository.ledgerTotalsByCategoryYear(ctx, year);
    return this.mapOperatingBudget(budget, this.actualAmountsByCategory(totals));
  }

  async saveOperatingBudget(input: SaveOperatingBudgetInput): Promise<OperatingBudgetDto> {
    const allowed = await this.scope.assertProperty(input.organizationId, input.propertyId);
    if (!allowed) throw new Error("PROPERTY_NOT_FOUND");

    const categories = await this.repository.listCategories(input);
    const categoryIds = new Set(categories.map((c) => c.id));
    const lines = input.lines
      .filter((line) => categoryIds.has(line.categoryId))
      .map((line) => {
        const amount = parseAmount(line.plannedAmount);
        return { categoryId: line.categoryId, plannedAmount: amount };
      });

    const saved = await this.repository.upsertOperatingBudget({
      ...input,
      notes: input.notes?.trim() || null,
      lines,
    });

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "finance.operatingBudget.save",
      entityType: "OperatingBudget",
      entityId: saved.id,
      metadata: { year: input.year, lineCount: lines.length },
    });

    const totals = await this.repository.ledgerTotalsByCategoryYear(input, input.year);
    return this.mapOperatingBudget(saved, this.actualAmountsByCategory(totals));
  }
}

export function createFinanceService(): FinanceService {
  return new FinanceService();
}
