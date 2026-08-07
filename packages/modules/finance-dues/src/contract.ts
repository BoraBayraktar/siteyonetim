import type {
  DueAccrualLineKind,
  DueAccrualStatus,
  DueCalculationMode,
  DueLineStatus,
  LateFeeRateKind,
  MeterKind,
  ReportExportFormat,
  SupplierLateFeeAllocationMode,
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
  meterKind: MeterKind | null;
  supplierLateFeeAllocationMode: SupplierLateFeeAllocationMode | null;
  autoAccrualMonthly: boolean;
  active: boolean;
};

export type DueLateFeePolicyDto = {
  propertyId: string;
  rateKind: LateFeeRateKind;
  monthlyRatePercent: string;
  /** Kanuni modda ilgili dönem yıllık oranın /12 eşdeğeri (%) */
  effectiveMonthlyRatePercent: string | null;
  graceDays: number;
  dueDayOfMonth: number;
  active: boolean;
};

export type LateFeePolicyTargetDto = {
  organizationId: string;
  propertyId: string;
  rateKind: LateFeeRateKind;
};

export type LegalInterestRateDto = {
  id: string;
  year: number;
  month: number;
  annualRatePercent: string;
  notes: string | null;
};

export type DueAccrualRunDto = {
  id: string;
  dueDefinitionId: string;
  dueDefinitionName: string;
  calculationMode: DueCalculationMode;
  meterKind: import("@siteyonetim/db").MeterKind | null;
  supplierLateFeeAllocationMode: SupplierLateFeeAllocationMode | null;
  supplierReference: string | null;
  year: number;
  month: number;
  status: DueAccrualStatus;
  totalAmount: string;
  lineCount: number;
};

export type DueAccrualRunLineDto = {
  id: string;
  unitId: string;
  unitCode: string;
  partyName: string | null;
  amount: string;
  meterConsumption: string | null;
  meterIndexCurrent: string | null;
  meterIndexPrevious: string | null;
};

export type DueAccrualLineDto = {
  id: string;
  unitId: string;
  unitCode: string;
  partyId: string | null;
  partyName: string | null;
  amount: string;
  paidAmount: string;
  remaining: string;
  status: DueLineStatus;
  year: number;
  month: number;
  lineKind: DueAccrualLineKind;
  dueDefinitionName: string;
  supplierLateFeeAllocationMode?: SupplierLateFeeAllocationMode | null;
  supplierReference?: string | null;
  /** LATE_FEE: overdue source accrual period / definition */
  sourceYear?: number;
  sourceMonth?: number;
  sourceDueDefinitionName?: string;
};

export type DuePaymentTargetDto = {
  unitId: string;
  unitCode: string;
  partyId: string;
  partyName: string;
  totalDebt: string;
};

export type DebtRowDto = {
  unitId: string;
  unitCode: string;
  blockId: string | null;
  blockName: string | null;
  partyId: string | null;
  partyName: string | null;
  totalDebt: string;
  aging0To30: string;
  aging31To60: string;
  aging61Plus: string;
};

export type PortalMemberDebtRowDto = {
  unitId: string;
  unitCode: string;
  blockName: string | null;
  totalDebt: string;
  aging0To30: string;
  aging31To60: string;
  aging61Plus: string;
};

export type PortalMemberDebtSummaryInput = {
  organizationId: string;
  propertyId: string;
  excludeUnitIds?: string[];
};

export type PortalMemberDebtSummaryDto = {
  propertyId: string;
  propertyName: string;
  rows: PortalMemberDebtRowDto[];
  totalDebt: string;
};

export type PortalOpenDebtLineDto = {
  id: string;
  year: number;
  month: number;
  lineKind: DueAccrualLineKind;
  dueDefinitionName: string;
  unitCode: string;
  blockName: string | null;
  amount: string;
  paidAmount: string;
  remaining: string;
  supplierLateFeeAllocationMode?: SupplierLateFeeAllocationMode | null;
  supplierReference?: string | null;
  /** LATE_FEE: overdue source accrual period */
  sourceYear?: number;
  sourceMonth?: number;
  sourceDueDefinitionName?: string;
};

export type ListDebtRowsInput = DuesContext & {
  page: number;
  pageSize: number;
  q?: string;
  blockId?: string | null;
  overdueOnly?: boolean;
};

export type ListOpenLinesInput = DuesContext & {
  page: number;
  pageSize: number;
  q?: string;
  blockId?: string | null;
  overdueOnly?: boolean;
};

export type PeriodRegisterCellStatus = DueLineStatus | "NONE";

export type PeriodRegisterCellDto = {
  lineId: string | null;
  dueDefinitionId: string;
  dueDefinitionName: string;
  amount: string;
  paidAmount: string;
  remaining: string;
  status: PeriodRegisterCellStatus;
  lineKind: DueAccrualLineKind | null;
  supplierLateFeeAllocationMode: SupplierLateFeeAllocationMode | null;
  supplierReference: string | null;
  lastDocumentNo: string | null;
  isOverdue: boolean;
};

export type PeriodRegisterRowDto = {
  unitId: string;
  unitCode: string;
  blockId: string | null;
  blockName: string | null;
  partyId: string | null;
  partyName: string | null;
  periodDebt: string;
  periodPaid: string;
  periodRemaining: string;
  totalOpenDebt: string;
  aging0To30: string;
  aging31To60: string;
  aging61Plus: string;
  cells: Record<string, PeriodRegisterCellDto>;
};

export type PeriodRegisterColumnDto = Pick<
  DueDefinitionDto,
  "id" | "name" | "calculationMode" | "supplierLateFeeAllocationMode"
>;

export type ListPeriodRegisterInput = DuesContext & {
  year: number;
  month: number;
  page: number;
  pageSize: number;
  q?: string;
  blockId?: string | null;
  overdueOnly?: boolean;
  withDebtOnly?: boolean;
};

export type PeriodRegisterPageDto = {
  period: { year: number; month: number };
  columns: PeriodRegisterColumnDto[];
  rows: PeriodRegisterRowDto[];
  total: number;
  page: number;
  pageSize: number;
};

export type ExportPeriodRegisterInput = ListPeriodRegisterInput & {
  format: ReportExportFormat;
  locale?: string;
};

export type ExportedPeriodRegisterFile = {
  buffer: Buffer;
  contentType: string;
  extension: string;
};

export type PaginatedDebtRows = {
  items: DebtRowDto[];
  total: number;
  page: number;
  pageSize: number;
};

export type DebtOverviewDto = {
  debtPage: PaginatedDebtRows;
  paymentTargets: DuePaymentTargetDto[];
};

export type AccrualContextPreload = {
  definitions: DueDefinitionDto[];
  runs: DueAccrualRunDto[];
  runLinesByRunId: Record<string, DueAccrualRunLineDto[]>;
  runCorrections?: Record<string, AccrualRunCorrectionDto>;
};

export type UnitDebtDetailPeriodDto = {
  year: number;
  month: number;
  periodDebt: string;
  periodPaid: string;
  periodRemaining: string;
};

export type UnitDebtDetailDto = {
  row: DebtRowDto;
  openLines: DueAccrualLineDto[];
  statement: StatementLineDto[];
  period?: UnitDebtDetailPeriodDto;
};

export type ExportUnitDebtDetailInput = DuesContext & {
  unitId: string;
  year: number;
  month: number;
  format: ReportExportFormat;
  locale?: string;
};

export type AccrualWarningCode =
  | "NO_DEFINITIONS"
  | "NO_UNITS"
  | "UNITS_WITHOUT_OCCUPANCY"
  | "DRAFT_ACCRUAL_PENDING"
  | "POSTED_ACCRUAL_INCOMPLETE"
  | "INCOMPLETE_METER_READINGS"
  | "NO_METER_CONSUMPTION"
  | "MISSING_PREVIOUS_MONTH_INDEX"
  | "METER_RUN_MISMATCH"
  | "METER_AMOUNT_MISMATCH";

export type AccrualMissingUnitReason =
  | "NO_OCCUPANCY"
  | "NO_METER"
  | "NO_METER_READING"
  | "MISSING_PREVIOUS_METER_INDEX"
  | "ZERO_AMOUNT"
  | "PENDING_IN_RUN";

export type AccrualMissingUnitDto = {
  unitId: string;
  unitCode: string;
  reasons: AccrualMissingUnitReason[];
};

export type AccrualRunCorrectionDto = {
  runId: string;
  canVoid: boolean;
  canSupplement: boolean;
  canPost: boolean;
  hasPayments: boolean;
  hasLateFees: boolean;
  missingUnitCount: number;
  missingUnits: AccrualMissingUnitDto[];
  accruedUnitCount: number;
  totalUnitCount: number;
  supplementBlockedReason:
    | "NONE"
    | "NOT_POSTED"
    | "PERIOD_CLOSED"
    | "NO_MISSING_UNITS"
    | "CALCULATION_MODE";
};

export type AccrualContextWarningDto = {
  code: AccrualWarningCode;
  severity: "info" | "warning" | "error";
  count?: number;
  period?: { year: number; month: number };
  meterKind?: MeterKind;
  runId?: string;
  definitionId?: string;
};

export type AccrualContextWarningsDto = {
  propertyId: string;
  period: { year: number; month: number };
  warnings: AccrualContextWarningDto[];
  canGenerateAccrual: boolean;
  blockingCodes: AccrualWarningCode[];
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
  meterKind?: MeterKind | null;
  supplierLateFeeAllocationMode?: SupplierLateFeeAllocationMode | null;
  autoAccrualMonthly?: boolean;
};

export type UpdateDueDefinitionInput = DuesContext & {
  definitionId: string;
  name: string;
  calculationMode: DueCalculationMode;
  fixedAmount?: string | null;
  ratePerM2?: string | null;
  meterKind?: MeterKind | null;
  supplierLateFeeAllocationMode?: SupplierLateFeeAllocationMode | null;
  autoAccrualMonthly?: boolean;
};

export type AutoAccrualTargetDto = {
  organizationId: string;
  propertyId: string;
  dueDefinitionId: string;
  calculationMode: DueCalculationMode;
};

export type DraftAccrualReminderTargetDto = {
  organizationId: string;
  propertyId: string;
  propertyName: string;
  year: number;
  month: number;
  draftRunCount: number;
};

export type GenerateAccrualInput = DuesContext & {
  dueDefinitionId: string;
  year: number;
  month: number;
  totalBillAmount?: string | null;
  totalBillConsumptionM3?: string | null;
  supplierLateFeeAllocationMode?: SupplierLateFeeAllocationMode | null;
  supplierReference?: string | null;
};

export type RecalculateAccrualInput = DuesContext & {
  runId: string;
  totalBillAmount?: string | null;
  totalBillConsumptionM3?: string | null;
};

export type AccrualBillInput = {
  totalBillAmount?: string | null;
  totalBillConsumptionM3?: string | null;
  supplierLateFeeAllocationMode?: SupplierLateFeeAllocationMode | null;
};

export type UpsertLateFeePolicyInput = DuesContext & {
  rateKind: LateFeeRateKind;
  monthlyRatePercent?: string;
  graceDays: number;
  dueDayOfMonth: number;
  active: boolean;
};

export type UpsertLegalInterestRateInput = {
  organizationId: string;
  year: number;
  month: number;
  annualRatePercent: string;
  notes?: string | null;
  actorUserId?: string | null;
};

export type ApplyLateFeesInput = DuesContext & {
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
  unitId?: string | null;
  amount: string;
  paymentDate?: Date;
  documentNo?: string | null;
  description?: string | null;
  autoAllocate?: boolean;
  allowAdvance?: boolean;
  allocations?: PaymentAllocationInput[];
};

export type RecordPaymentResult = {
  paymentId: string;
  allocatedAmount: string;
  advanceAmount: string;
};

export interface DuesServiceContract {
  listDefinitions(ctx: DuesContext): Promise<DueDefinitionDto[]>;
  createDefinition(input: CreateDueDefinitionInput): Promise<DueDefinitionDto>;
  updateDefinition(input: UpdateDueDefinitionInput): Promise<DueDefinitionDto>;
  setDefinitionAutoAccrual(
    ctx: DuesContext,
    definitionId: string,
    autoAccrualMonthly: boolean,
  ): Promise<DueDefinitionDto>;
  listAutoAccrualDefinitionTargets(): Promise<AutoAccrualTargetDto[]>;
  listDraftAccrualReminderTargets(year: number, month: number): Promise<DraftAccrualReminderTargetDto[]>;
  listAccrualRuns(ctx: DuesContext): Promise<DueAccrualRunDto[]>;
  listAccrualRunLinesByProperty(ctx: DuesContext): Promise<Record<string, DueAccrualRunLineDto[]>>;
  generateAccrual(input: GenerateAccrualInput): Promise<DueAccrualRunDto>;
  recalculateAccrual(input: RecalculateAccrualInput): Promise<DueAccrualRunDto>;
  postAccrual(ctx: DuesContext, runId: string): Promise<DueAccrualRunDto>;
  voidPostedAccrual(ctx: DuesContext, runId: string): Promise<DueAccrualRunDto>;
  supplementPostedAccrual(ctx: DuesContext, runId: string): Promise<DueAccrualRunDto>;
  listAccrualRunCorrections(ctx: DuesContext): Promise<Record<string, AccrualRunCorrectionDto>>;
  listOpenLines(input: ListOpenLinesInput): Promise<{ items: DueAccrualLineDto[]; total: number }>;
  listPaymentTargets(ctx: DuesContext): Promise<DuePaymentTargetDto[]>;
  getDebtDashboard(ctx: DuesContext): Promise<DebtRowDto[]>;
  listDebtRows(input: ListDebtRowsInput): Promise<PaginatedDebtRows>;
  listPeriodRegister(input: ListPeriodRegisterInput): Promise<PeriodRegisterPageDto>;
  exportPeriodRegister(input: ExportPeriodRegisterInput): Promise<ExportedPeriodRegisterFile>;
  listDebtOverview(input: ListDebtRowsInput): Promise<DebtOverviewDto>;
  getUnitDebtDetail(
    ctx: DuesContext,
    unitId: string,
    period?: { year: number; month: number },
  ): Promise<UnitDebtDetailDto | null>;
  exportUnitDebtDetail(input: ExportUnitDebtDetailInput): Promise<ExportedPeriodRegisterFile>;
  getAccrualContextWarnings(
    ctx: DuesContext,
    period: { year: number; month: number },
    preload?: AccrualContextPreload,
  ): Promise<AccrualContextWarningsDto>;
  recordPayment(input: RecordPaymentInput): Promise<RecordPaymentResult>;
  getPartyStatement(ctx: DuesContext, partyId: string): Promise<StatementLineDto[]>;
  getPortalStatement(userId: string): Promise<StatementLineDto[]>;
  getPortalOpenDebt(userId: string): Promise<string>;
  getPortalStatementForUnit(propertyId: string, unitId: string): Promise<StatementLineDto[]>;
  getPortalOpenDebtForUnit(propertyId: string, unitId: string): Promise<string>;
  getPortalOpenDebtLines(userId: string): Promise<PortalOpenDebtLineDto[]>;
  getPortalOpenDebtLinesForUnit(propertyId: string, unitId: string): Promise<PortalOpenDebtLineDto[]>;
  getPortalMemberDebtSummary(input: PortalMemberDebtSummaryInput): Promise<PortalMemberDebtSummaryDto>;
  getLateFeePolicy(ctx: DuesContext): Promise<DueLateFeePolicyDto | null>;
  upsertLateFeePolicy(input: UpsertLateFeePolicyInput): Promise<DueLateFeePolicyDto>;
  applyLateFees(input: ApplyLateFeesInput): Promise<{ added: number; runId: string | null }>;
  listActiveLateFeePolicyTargets(): Promise<LateFeePolicyTargetDto[]>;
  listLegalInterestRates(year: number): Promise<LegalInterestRateDto[]>;
  upsertLegalInterestRate(input: UpsertLegalInterestRateInput): Promise<LegalInterestRateDto>;
}
