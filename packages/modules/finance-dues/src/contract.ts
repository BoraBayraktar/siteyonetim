import type {
  DueAccrualStatus,
  DueCalculationMode,
  DueLineStatus,
} from "@siteyonetim/db";

export type DuesContext = {
  organizationId: string;
  propertyId: string;
  actorUserId?: string | null;
};

export type DueDefinitionDto = {
  id: string;
  name: string;
  calculationMode: DueCalculationMode;
  fixedAmount: string | null;
  ratePerM2: string | null;
  active: boolean;
};

export type DueAccrualRunDto = {
  id: string;
  dueDefinitionName: string;
  year: number;
  month: number;
  status: DueAccrualStatus;
  totalAmount: string;
  lineCount: number;
};

export type DueAccrualLineDto = {
  id: string;
  unitCode: string;
  partyName: string | null;
  amount: string;
  paidAmount: string;
  remaining: string;
  status: DueLineStatus;
  year: number;
  month: number;
};

export type DebtRowDto = {
  unitId: string;
  unitCode: string;
  partyName: string | null;
  totalDebt: string;
  aging0To30: string;
  aging31To60: string;
  aging61Plus: string;
};

export type StatementLineDto = {
  kind: "ACCRUAL" | "PAYMENT";
  date: Date;
  label: string;
  debit: string;
  credit: string;
  balance: string;
};

export type CreateDueDefinitionInput = DuesContext & {
  name: string;
  calculationMode: DueCalculationMode;
  fixedAmount?: string | null;
  ratePerM2?: string | null;
};

export type GenerateAccrualInput = DuesContext & {
  dueDefinitionId: string;
  year: number;
  month: number;
};

export type PaymentAllocationInput = {
  dueAccrualLineId: string;
  amount: string;
};

export type RecordPaymentInput = DuesContext & {
  cashboxId: string;
  partyId: string;
  amount: string;
  paymentDate?: Date;
  documentNo?: string | null;
  description?: string | null;
  autoAllocate?: boolean;
  allocations?: PaymentAllocationInput[];
};

export interface DuesServiceContract {
  listDefinitions(ctx: DuesContext): Promise<DueDefinitionDto[]>;
  createDefinition(input: CreateDueDefinitionInput): Promise<DueDefinitionDto>;
  listAccrualRuns(ctx: DuesContext): Promise<DueAccrualRunDto[]>;
  generateAccrual(input: GenerateAccrualInput): Promise<DueAccrualRunDto>;
  postAccrual(ctx: DuesContext, runId: string): Promise<DueAccrualRunDto>;
  listOpenLines(ctx: DuesContext, page: number, pageSize: number): Promise<{ items: DueAccrualLineDto[]; total: number }>;
  getDebtDashboard(ctx: DuesContext): Promise<DebtRowDto[]>;
  recordPayment(input: RecordPaymentInput): Promise<{ paymentId: string }>;
  getPartyStatement(ctx: DuesContext, partyId: string): Promise<StatementLineDto[]>;
  getPortalStatement(userId: string): Promise<StatementLineDto[]>;
  getPortalOpenDebt(userId: string): Promise<string>;
}
