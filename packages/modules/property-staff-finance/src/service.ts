import { Prisma, StaffMovementType } from "@siteyonetim/db";
import { createAuditService } from "@siteyonetim/platform-audit";

import type {
  CreateStaffProfileInput,
  ExportStaffAccountsInput,
  ExportStaffAccountsResult,
  ListStaffProfilesInput,
  ListStaffStatementInput,
  RecordStaffMovementInput,
  StaffAccountMovementDto,
  StaffFinanceServiceContract,
  StaffProfileDto,
  UpdateStaffProfileInput,
} from "./contract";
import { StaffFinanceRepository } from "./repository";
import {
  buildStaffFinanceXlsxBuffer,
  STAFF_FINANCE_XLSX_CONTENT_TYPE,
  staffFinanceFileName,
} from "./staff-finance-excel";
import { resolveStaffMovementPolicy } from "./movement-policy";

function parseAmount(raw: string): Prisma.Decimal {
  const value = new Prisma.Decimal(raw.replace(",", ".").trim());
  if (value.lte(0)) throw new Error("AMOUNT_INVALID");
  return value;
}

function mapProfile(row: {
  id: string;
  partyId: string;
  financeAccountId: string;
  staffNo: string | null;
  title: string | null;
  department: string | null;
  employmentStartDate: Date | null;
  employmentEndDate: Date | null;
  status: import("@siteyonetim/db").StaffEmploymentStatus;
  party: { displayName: string };
  financeAccount: { code: string; balance: Prisma.Decimal };
}): StaffProfileDto {
  return {
    id: row.id,
    partyId: row.partyId,
    partyName: row.party.displayName,
    financeAccountId: row.financeAccountId,
    financeAccountCode: row.financeAccount.code,
    balance: row.financeAccount.balance.toString(),
    staffNo: row.staffNo,
    title: row.title,
    department: row.department,
    employmentStartDate: row.employmentStartDate,
    employmentEndDate: row.employmentEndDate,
    status: row.status,
  };
}

function mapMovement(row: {
  id: string;
  staffProfileId: string;
  movementType: StaffMovementType;
  amount: Prisma.Decimal;
  movementDate: Date;
  periodYear: number;
  periodMonth: number;
  documentNo: string | null;
  description: string | null;
  ledgerEntryId: string | null;
}): StaffAccountMovementDto {
  return {
    id: row.id,
    staffProfileId: row.staffProfileId,
    movementType: row.movementType,
    amount: row.amount.toString(),
    movementDate: row.movementDate,
    periodYear: row.periodYear,
    periodMonth: row.periodMonth,
    documentNo: row.documentNo,
    description: row.description,
    ledgerEntryId: row.ledgerEntryId,
  };
}

function accountCode(partyId: string) {
  return `PRS-${partyId.slice(-8).toUpperCase()}`;
}

export class StaffFinanceService implements StaffFinanceServiceContract {
  constructor(
    private readonly repository = new StaffFinanceRepository(),
    private readonly audit = createAuditService(),
  ) {}

  private async assertProperty(input: { organizationId: string; propertyId: string }) {
    const property = await this.repository.assertProperty(input);
    if (!property) throw new Error("PROPERTY_NOT_FOUND");
  }

  async listStaffProfiles(input: ListStaffProfilesInput) {
    await this.assertProperty(input);
    const { rows, total } = await this.repository.listStaffProfiles(input);
    return {
      items: rows.map(mapProfile),
      total,
      page: input.page,
      pageSize: input.pageSize,
    };
  }

  async createStaffProfile(input: CreateStaffProfileInput) {
    await this.assertProperty(input);
    const created = await this.repository.createStaffProfile(input, accountCode(input.partyId));
    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "staffFinance.profile.create",
      entityType: "PropertyStaffProfile",
      entityId: created.id,
      metadata: { partyId: input.partyId, financeAccountId: created.financeAccountId },
    });
    return mapProfile(created);
  }

  async updateStaffProfile(input: UpdateStaffProfileInput) {
    await this.assertProperty(input);
    const existing = await this.repository.findStaffProfile(input, input.staffProfileId);
    if (!existing) throw new Error("STAFF_PROFILE_NOT_FOUND");
    const updated = await this.repository.updateStaffProfile(input);
    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "staffFinance.profile.update",
      entityType: "PropertyStaffProfile",
      entityId: updated.id,
      metadata: { status: input.status },
    });
    return mapProfile(updated);
  }

  async listStatement(input: ListStaffStatementInput) {
    await this.assertProperty(input);
    const profile = await this.repository.findStaffProfile(input, input.staffProfileId);
    if (!profile) throw new Error("STAFF_PROFILE_NOT_FOUND");
    const { rows, total } = await this.repository.listStatement(input);
    return {
      items: rows.map(mapMovement),
      total,
      page: input.page,
      pageSize: input.pageSize,
    };
  }

  async recordMovement(input: RecordStaffMovementInput) {
    await this.assertProperty(input);
    const profile = await this.repository.findStaffProfile(input, input.staffProfileId);
    if (!profile) throw new Error("STAFF_PROFILE_NOT_FOUND");
    if (profile.status !== "ACTIVE") throw new Error("STAFF_PROFILE_PASSIVE");

    const amount = parseAmount(input.amount);
    const movementDate = input.movementDate ?? new Date();
    const period = await this.repository.getOrCreatePeriod(
      input,
      movementDate.getFullYear(),
      movementDate.getMonth() + 1,
    );
    if (period.status !== "OPEN") throw new Error("PERIOD_CLOSED");

    const policy = resolveStaffMovementPolicy(input.movementType, amount);
    if (input.cashboxId && !policy.cashboxDirection) throw new Error("CASHBOX_NOT_ALLOWED");
    const row = await this.repository.recordMovementTx(
      { ...input, movementDate },
      profile,
      period.id,
      amount,
      policy.entryType,
      policy.categoryType,
      policy.accountDelta,
      policy.cashboxDirection,
    );

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "staffFinance.movement.record",
      entityType: "StaffAccountMovement",
      entityId: row.id,
      metadata: {
        staffProfileId: input.staffProfileId,
        movementType: input.movementType,
        entryType: policy.entryType,
        expectedCategoryType: policy.categoryType,
        amount: amount.toString(),
      },
    });

    return mapMovement(row);
  }

  async exportToXlsx(input: ExportStaffAccountsInput): Promise<ExportStaffAccountsResult> {
    await this.assertProperty(input);
    const profiles = (await this.repository.listAllStaffProfiles(input)).map(mapProfile);
    const selectedProfile = input.staffProfileId
      ? await this.repository.findStaffProfile(input, input.staffProfileId)
      : null;
    const statementProfile = selectedProfile ? mapProfile(selectedProfile) : null;
    const movements = statementProfile
      ? (await this.repository.listAllStatement(input, statementProfile.id)).map(mapMovement)
      : [];

    const buffer = await buildStaffFinanceXlsxBuffer({
      locale: input.locale,
      propertyName: input.propertyName,
      profiles,
      statement: statementProfile ? { profile: statementProfile, movements } : null,
    });

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "staffFinance.export",
      entityType: "Property",
      entityId: input.propertyId,
      metadata: {
        profileCount: profiles.length,
        staffProfileId: input.staffProfileId ?? null,
        movementCount: movements.length,
      },
    });

    return {
      buffer,
      fileName: staffFinanceFileName(input.propertyName, input.locale, Boolean(statementProfile)),
      contentType: STAFF_FINANCE_XLSX_CONTENT_TYPE,
    };
  }
}

export function createStaffFinanceService(): StaffFinanceServiceContract {
  return new StaffFinanceService();
}
