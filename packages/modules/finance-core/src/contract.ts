import type {
  FinanceAccountKind,
  FinanceCategoryType,
  FinancePeriodStatus,
  LedgerEntryType,
} from "@siteyonetim/db";

export type FinanceContext = {
  organizationId: string;
  propertyId: string;
  actorUserId?: string | null;
};

export type FinancePeriodDto = {
  id: string;
  year: number;
  month: number;
  status: FinancePeriodStatus;
};

export type FinanceCategoryDto = {
  id: string;
  name: string;
  type: FinanceCategoryType;
};

export type FinanceAccountDto = {
  id: string;
  code: string;
  name: string;
  kind: FinanceAccountKind;
  balance: string;
  partyId: string | null;
};

export type CashboxDto = {
  id: string;
  name: string;
  balance: string;
};

export type LedgerEntryDto = {
  id: string;
  entryType: LedgerEntryType;
  amount: string;
  documentNo: string | null;
  description: string | null;
  entryDate: Date;
  categoryName: string;
  cashboxName: string | null;
  accountName: string | null;
};

export type PaginatedLedger = {
  items: LedgerEntryDto[];
  total: number;
  page: number;
  pageSize: number;
};

export type CreateCategoryInput = FinanceContext & {
  name: string;
  type: FinanceCategoryType;
};

export type CreateAccountInput = FinanceContext & {
  code: string;
  name: string;
  kind: FinanceAccountKind;
  partyId?: string | null;
};

export type CreateCashboxInput = FinanceContext & {
  name: string;
};

export type CreateLedgerEntryInput = FinanceContext & {
  entryType: LedgerEntryType;
  categoryId: string;
  amount: string;
  cashboxId?: string | null;
  financeAccountId?: string | null;
  documentNo?: string | null;
  description?: string | null;
  entryDate?: Date;
};

export type ListLedgerInput = FinanceContext & {
  page: number;
  pageSize: number;
};

export type OperatingBudgetLineDto = {
  categoryId: string;
  categoryName: string;
  categoryType: FinanceCategoryType;
  plannedAmount: string;
  actualAmount: string;
};

export type OperatingBudgetDto = {
  id: string;
  year: number;
  notes: string | null;
  lines: OperatingBudgetLineDto[];
  totalPlanned: string;
  totalActual: string;
};

export type SaveOperatingBudgetInput = FinanceContext & {
  year: number;
  notes?: string | null;
  lines: Array<{ categoryId: string; plannedAmount: string }>;
};

export interface FinanceServiceContract {
  ensureOpenPeriod(ctx: FinanceContext, date?: Date): Promise<FinancePeriodDto>;
  listCategories(ctx: FinanceContext): Promise<FinanceCategoryDto[]>;
  createCategory(input: CreateCategoryInput): Promise<FinanceCategoryDto>;
  listAccounts(ctx: FinanceContext, page: number, pageSize: number): Promise<{ items: FinanceAccountDto[]; total: number }>;
  createAccount(input: CreateAccountInput): Promise<FinanceAccountDto>;
  listCashboxes(ctx: FinanceContext): Promise<CashboxDto[]>;
  createCashbox(input: CreateCashboxInput): Promise<CashboxDto>;
  listLedger(input: ListLedgerInput): Promise<PaginatedLedger>;
  createLedgerEntry(input: CreateLedgerEntryInput): Promise<LedgerEntryDto>;
  closePeriod(ctx: FinanceContext, periodId: string): Promise<FinancePeriodDto>;
  getOperatingBudget(ctx: FinanceContext, year: number): Promise<OperatingBudgetDto | null>;
  saveOperatingBudget(input: SaveOperatingBudgetInput): Promise<OperatingBudgetDto>;
}
