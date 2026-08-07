import type {
  BankStatementImportSource,
  BankStatementMatchStatus,
  BankSyncProviderKind,
  StaffMovementType,
} from "@siteyonetim/db";

export type BankingContext = {
  organizationId: string;
  propertyId: string;
  actorUserId?: string | null;
};

export type ParsedBankLine = {
  lineDate: Date;
  amount: string;
  description: string | null;
  reference: string | null;
};

export type BankStatementImportDto = {
  id: string;
  cashboxId: string;
  cashboxName: string;
  fileName: string;
  source: BankStatementImportSource;
  year: number;
  month: number;
  lineCount: number;
  matchedCount: number;
  unmatchedCount: number;
  importedAt: Date;
};

export type PropertyBankWebhookProfileDto = {
  propertyId: string;
  enabled: boolean;
  providerKind: BankSyncProviderKind;
  cashboxId: string | null;
  pollUrl: string | null;
  hasSecret: boolean;
  hasPollToken: boolean;
  lastReceivedAt: Date | null;
  lastPollAt: Date | null;
};

export type UpsertBankWebhookProfileInput = BankingContext & {
  enabled: boolean;
  providerKind: BankSyncProviderKind;
  cashboxId: string | null;
  pollUrl?: string | null;
  restPollBearerToken?: string | null;
};

export type BankRestPollSyncTarget = {
  organizationId: string;
  propertyId: string;
  cashboxId: string;
  pollUrl: string;
  restPollBearerToken: string;
};

export type BankRestPollSyncPropertyResult = {
  organizationId: string;
  propertyId: string;
  status: "SUCCEEDED" | "FAILED" | "SKIPPED";
  lineCount?: number;
  matchedOnImport?: number;
  error?: string;
};

export type RunBankRestPollSyncResult = {
  properties: BankRestPollSyncPropertyResult[];
};

export type RotateBankWebhookSecretResult = {
  profile: PropertyBankWebhookProfileDto;
  webhookSecret: string;
};

export type BankStatementLineDto = {
  id: string;
  importId: string;
  lineDate: Date;
  amount: string;
  description: string | null;
  reference: string | null;
  matchStatus: BankStatementMatchStatus;
  matchedTargetLabel: string | null;
  cashboxName: string;
};

export type ImportBankStatementInput = BankingContext & {
  cashboxId: string;
  fileName: string;
  year: number;
  month: number;
  csvContent: string;
};

export type ImportBankStatementResult = {
  import: BankStatementImportDto;
  matchedOnImport: number;
};

export type ListUnmatchedLinesInput = BankingContext & {
  year: number;
  month: number;
  page?: number;
  pageSize?: number;
};

export type MatchLineAsStaffMovementInput = BankingContext & {
  lineId: string;
  staffProfileId: string;
  movementType: StaffMovementType;
  categoryId: string;
  description?: string | null;
};

export type PaginatedBankLines = {
  items: BankStatementLineDto[];
  total: number;
  page: number;
  pageSize: number;
};

export type BankReconciliationSummaryDto = {
  year: number;
  month: number;
  totalLines: number;
  matchedLines: number;
  unmatchedLines: number;
  ignoredLines: number;
  unmatchedAmountTotal: string;
  rows: BankReconciliationRowDto[];
};

export type BankReconciliationRowDto = {
  lineDate: string;
  cashboxName: string;
  amount: string;
  description: string | null;
  matchStatus: BankStatementMatchStatus;
  matchedTarget: string | null;
};

export interface BankingServiceContract {
  importCsv(input: ImportBankStatementInput): Promise<ImportBankStatementResult>;
  importFromWebhook(
    propertyId: string,
    webhookSecret: string,
    body: unknown,
  ): Promise<ImportBankStatementResult>;
  getWebhookProfile(ctx: BankingContext): Promise<PropertyBankWebhookProfileDto | null>;
  upsertWebhookProfile(input: UpsertBankWebhookProfileInput): Promise<PropertyBankWebhookProfileDto>;
  rotateWebhookSecret(ctx: BankingContext): Promise<RotateBankWebhookSecretResult>;
  syncRestPollProfiles(actorUserId?: string | null): Promise<RunBankRestPollSyncResult>;
  listImports(ctx: BankingContext, year: number, month: number): Promise<BankStatementImportDto[]>;
  listUnmatchedLines(input: ListUnmatchedLinesInput): Promise<PaginatedBankLines>;
  runAutoMatch(ctx: BankingContext, importId: string): Promise<{ matched: number }>;
  matchLineAsStaffMovement(input: MatchLineAsStaffMovementInput): Promise<void>;
  ignoreLine(ctx: BankingContext, lineId: string): Promise<void>;
  buildReconciliationSummary(
    ctx: BankingContext,
    year: number,
    month: number,
  ): Promise<BankReconciliationSummaryDto>;
}
