import type { StaffEmploymentStatus, StaffMovementType } from "@siteyonetim/db";

export type StaffFinanceContext = {
  organizationId: string;
  propertyId: string;
  actorUserId?: string | null;
};

export type StaffProfileDto = {
  id: string;
  partyId: string;
  partyName: string;
  financeAccountId: string;
  financeAccountCode: string;
  balance: string;
  staffNo: string | null;
  title: string | null;
  department: string | null;
  employmentStartDate: Date | null;
  employmentEndDate: Date | null;
  status: StaffEmploymentStatus;
};

export type StaffAccountMovementDto = {
  id: string;
  staffProfileId: string;
  movementType: StaffMovementType;
  amount: string;
  movementDate: Date;
  periodYear: number;
  periodMonth: number;
  documentNo: string | null;
  description: string | null;
  ledgerEntryId: string | null;
};

export type PaginatedStaffProfiles = {
  items: StaffProfileDto[];
  total: number;
  page: number;
  pageSize: number;
};

export type PaginatedStaffStatement = {
  items: StaffAccountMovementDto[];
  total: number;
  page: number;
  pageSize: number;
};

export type StaffFinanceSummaryDto = {
  activeCount: number;
  totalPayable: string;
};

export type ListStaffProfilesInput = StaffFinanceContext & {
  page: number;
  pageSize: number;
  status?: StaffEmploymentStatus | "ALL";
};

export type CreateStaffProfileInput = StaffFinanceContext & {
  partyId: string;
  staffNo?: string | null;
  title?: string | null;
  department?: string | null;
  employmentStartDate?: Date | null;
};

export type UpdateStaffProfileInput = StaffFinanceContext & {
  staffProfileId: string;
  staffNo?: string | null;
  title?: string | null;
  department?: string | null;
  employmentStartDate?: Date | null;
  employmentEndDate?: Date | null;
  status: StaffEmploymentStatus;
};

export type ListStaffStatementInput = StaffFinanceContext & {
  staffProfileId: string;
  page: number;
  pageSize: number;
};

export type RecordStaffMovementInput = StaffFinanceContext & {
  staffProfileId: string;
  movementType: StaffMovementType;
  amount: string;
  categoryId: string;
  cashboxId?: string | null;
  movementDate?: Date | null;
  documentNo?: string | null;
  description?: string | null;
};

export type ExportStaffAccountsInput = StaffFinanceContext & {
  locale: string;
  propertyName: string;
  staffProfileId?: string | null;
};

export type ExportStaffAccountsResult = {
  buffer: Buffer;
  fileName: string;
  contentType: string;
};

export interface StaffFinanceServiceContract {
  listStaffProfiles(input: ListStaffProfilesInput): Promise<PaginatedStaffProfiles>;
  getStaffSummary(input: StaffFinanceContext): Promise<StaffFinanceSummaryDto>;
  createStaffProfile(input: CreateStaffProfileInput): Promise<StaffProfileDto>;
  updateStaffProfile(input: UpdateStaffProfileInput): Promise<StaffProfileDto>;
  listStatement(input: ListStaffStatementInput): Promise<PaginatedStaffStatement>;
  recordMovement(input: RecordStaffMovementInput): Promise<StaffAccountMovementDto>;
  exportToXlsx(input: ExportStaffAccountsInput): Promise<ExportStaffAccountsResult>;
}
