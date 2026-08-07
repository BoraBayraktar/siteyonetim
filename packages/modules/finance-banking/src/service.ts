import {
  BankStatementImportSource,
  BankStatementMatchStatus,
  BankSyncProviderKind,
  Prisma,
  StaffMovementType,
} from "@siteyonetim/db";
import { createAuditService } from "@siteyonetim/platform-audit";
import { createStaffFinanceService, type StaffFinanceServiceContract } from "@siteyonetim/property-staff-finance";

import { parseBankStatementCsv } from "./csv-parser";
import type {
  BankingContext,
  BankingServiceContract,
  BankReconciliationSummaryDto,
  BankStatementImportDto,
  BankStatementLineDto,
  ImportBankStatementInput,
  ImportBankStatementResult,
  ListUnmatchedLinesInput,
  MatchLineAsStaffMovementInput,
  PaginatedBankLines,
  ParsedBankLine,
  PropertyBankWebhookProfileDto,
  RotateBankWebhookSecretResult,
  RunBankRestPollSyncResult,
  UpsertBankWebhookProfileInput,
} from "./contract";
import { BankingRepository } from "./repository";
import { fetchRestPollLines } from "./rest-poll-provider";
import { parseBankWebhookPayload } from "./webhook-payload";
import { generateWebhookSecret, hashWebhookSecret, verifyWebhookSecret } from "./webhook-secret";

function mapImport(row: {
  id: string;
  cashboxId: string;
  fileName: string;
  source: BankStatementImportSource;
  year: number;
  month: number;
  lineCount: number;
  matchedCount: number;
  importedAt: Date;
  cashbox: { name: string };
}): BankStatementImportDto {
  return {
    id: row.id,
    cashboxId: row.cashboxId,
    cashboxName: row.cashbox.name,
    fileName: row.fileName,
    source: row.source,
    year: row.year,
    month: row.month,
    lineCount: row.lineCount,
    matchedCount: row.matchedCount,
    unmatchedCount: Math.max(0, row.lineCount - row.matchedCount),
    importedAt: row.importedAt,
  };
}

function matchedTargetLabel(line: {
  matchedPayment: { documentNo: string | null; description: string | null } | null;
  matchedCashboxMovement: {
    description: string | null;
    ledgerEntry?: {
      staffMovements: Array<{
        movementType: string;
        staffProfile: { party: { displayName: string } };
      }>;
    } | null;
  } | null;
}): string | null {
  if (line.matchedPayment) {
    return line.matchedPayment.documentNo ?? line.matchedPayment.description ?? "Payment";
  }
  if (line.matchedCashboxMovement) {
    const staffMovement = line.matchedCashboxMovement.ledgerEntry?.staffMovements[0];
    if (staffMovement) {
      return `${staffMovement.staffProfile.party.displayName} - ${staffMovement.movementType}`;
    }
    return line.matchedCashboxMovement.description ?? "Cashbox movement";
  }
  return null;
}

function mapLine(row: {
  id: string;
  importId: string;
  lineDate: Date;
  amount: Prisma.Decimal;
  description: string | null;
  reference: string | null;
  matchStatus: BankStatementMatchStatus;
  import: { cashbox: { name: string } };
  matchedPayment?: { documentNo: string | null; description: string | null } | null;
  matchedCashboxMovement?: { description: string | null } | null;
}): BankStatementLineDto {
  return {
    id: row.id,
    importId: row.importId,
    lineDate: row.lineDate,
    amount: row.amount.toString(),
    description: row.description,
    reference: row.reference,
    matchStatus: row.matchStatus,
    matchedTargetLabel: matchedTargetLabel({
      matchedPayment: row.matchedPayment ?? null,
      matchedCashboxMovement: row.matchedCashboxMovement ?? null,
    }),
    cashboxName: row.import.cashbox.name,
  };
}

export class BankingService implements BankingServiceContract {
  constructor(
    private readonly repository = new BankingRepository(),
    private readonly audit = createAuditService(),
    private readonly staffFinance: StaffFinanceServiceContract = createStaffFinanceService(),
  ) {}

  private async assertContext(ctx: BankingContext) {
    const ok = await this.repository.assertProperty(ctx.organizationId, ctx.propertyId);
    if (!ok) throw new Error("PROPERTY_NOT_FOUND");
  }

  private async importParsedLines(
    ctx: BankingContext,
    input: {
      cashboxId: string;
      fileName: string;
      source: BankStatementImportSource;
      year: number;
      month: number;
      lines: ParsedBankLine[];
      auditAction: string;
      auditMetadata?: Record<string, unknown>;
    },
  ): Promise<ImportBankStatementResult> {
    const created = await this.repository.createImport(ctx, {
      cashboxId: input.cashboxId,
      fileName: input.fileName,
      source: input.source,
      year: input.year,
      month: input.month,
      lineCount: input.lines.length,
    });

    await this.repository.createLines(created.id, input.lines);
    const { matched } = await this.runAutoMatch(ctx, created.id);
    const updated = await this.repository.updateImportMatchedCount(created.id);

    await this.audit.record({
      organizationId: ctx.organizationId,
      userId: ctx.actorUserId,
      action: input.auditAction,
      entityType: "BankStatementImport",
      entityId: created.id,
      metadata: {
        fileName: input.fileName,
        lineCount: input.lines.length,
        matchedOnImport: matched,
        cashboxId: input.cashboxId,
        year: input.year,
        month: input.month,
        source: input.source,
        ...input.auditMetadata,
      },
    });

    return {
      import: mapImport(updated),
      matchedOnImport: matched,
    };
  }

  async importCsv(input: ImportBankStatementInput): Promise<ImportBankStatementResult> {
    await this.assertContext(input);

    const cashbox = await this.repository.assertCashbox(input, input.cashboxId);
    if (!cashbox) throw new Error("CASHBOX_NOT_FOUND");

    const parsed = parseBankStatementCsv(input.csvContent);
    return this.importParsedLines(input, {
      cashboxId: input.cashboxId,
      fileName: input.fileName.trim() || "statement.csv",
      source: BankStatementImportSource.MANUAL_CSV,
      year: input.year,
      month: input.month,
      lines: parsed,
      auditAction: "banking.statement.import",
    });
  }

  async importFromWebhook(
    propertyId: string,
    webhookSecret: string,
    body: unknown,
  ): Promise<ImportBankStatementResult> {
    const profile = await this.repository.getWebhookProfileByPropertyId(propertyId);
    if (!profile?.enabled) {
      throw new Error("BANK_WEBHOOK_DISABLED");
    }
    if (!verifyWebhookSecret(webhookSecret, profile.webhookSecretHash)) {
      throw new Error("BANK_WEBHOOK_UNAUTHORIZED");
    }
    if (!profile.cashboxId) {
      throw new Error("BANK_WEBHOOK_CASHBOX_REQUIRED");
    }

    const cashbox = await this.repository.assertCashbox(
      { organizationId: profile.organizationId, propertyId },
      profile.cashboxId,
    );
    if (!cashbox) throw new Error("CASHBOX_NOT_FOUND");

    const { lines, year, month } = parseBankWebhookPayload(body);
    const ctx: BankingContext = {
      organizationId: profile.organizationId,
      propertyId,
      actorUserId: null,
    };

    const result = await this.importParsedLines(ctx, {
      cashboxId: profile.cashboxId,
      fileName: `webhook-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`,
      source: BankStatementImportSource.API_WEBHOOK,
      year,
      month,
      lines,
      auditAction: "banking.statement.webhookImport",
    });

    await this.repository.touchWebhookReceived(propertyId);
    return result;
  }

  async getWebhookProfile(ctx: BankingContext): Promise<PropertyBankWebhookProfileDto | null> {
    await this.assertContext(ctx);
    return this.repository.getWebhookProfile(ctx);
  }

  async upsertWebhookProfile(input: UpsertBankWebhookProfileInput): Promise<PropertyBankWebhookProfileDto> {
    await this.assertContext(input);

    if (input.enabled && !input.cashboxId) {
      throw new Error("BANK_WEBHOOK_CASHBOX_REQUIRED");
    }

    const existing = await this.repository.getWebhookProfile(input);

    if (input.enabled && input.providerKind === BankSyncProviderKind.GENERIC_REST_POLL) {
      const pollUrl = input.pollUrl?.trim() || existing?.pollUrl;
      if (!pollUrl) {
        throw new Error("BANK_POLL_URL_REQUIRED");
      }
      const hasToken = Boolean(input.restPollBearerToken?.trim() || existing?.hasPollToken);
      if (!hasToken) {
        throw new Error("BANK_POLL_TOKEN_REQUIRED");
      }
    }

    if (input.cashboxId) {
      const cashbox = await this.repository.assertCashbox(input, input.cashboxId);
      if (!cashbox) throw new Error("CASHBOX_NOT_FOUND");
    }

    const saved = await this.repository.upsertWebhookProfile(input, {
      enabled: input.enabled,
      providerKind: input.providerKind,
      cashboxId: input.cashboxId,
      pollUrl: input.pollUrl,
      restPollBearerToken: input.restPollBearerToken,
    });

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "banking.webhookProfile.upsert",
      entityType: "PropertyBankWebhookProfile",
      entityId: input.propertyId,
      metadata: {
        enabled: saved.enabled,
        providerKind: saved.providerKind,
        cashboxId: saved.cashboxId,
      },
    });

    return saved;
  }

  async syncRestPollProfiles(actorUserId?: string | null): Promise<RunBankRestPollSyncResult> {
    const targets = await this.repository.listRestPollTargets();
    const properties: RunBankRestPollSyncResult["properties"] = [];

    for (const target of targets) {
      const ctx: BankingContext = {
        organizationId: target.organizationId,
        propertyId: target.propertyId,
        actorUserId: actorUserId ?? null,
      };

      try {
        const { lines, year, month } = await fetchRestPollLines(
          target.pollUrl,
          target.restPollBearerToken,
        );

        const result = await this.importParsedLines(ctx, {
          cashboxId: target.cashboxId,
          fileName: `poll-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`,
          source: BankStatementImportSource.API_REST_POLL,
          year,
          month,
          lines,
          auditAction: "banking.statement.restPollImport",
        });

        await this.repository.touchPollReceived(target.propertyId);
        properties.push({
          organizationId: target.organizationId,
          propertyId: target.propertyId,
          status: "SUCCEEDED",
          lineCount: result.import.lineCount,
          matchedOnImport: result.matchedOnImport,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "BANK_POLL_FAILED";
        properties.push({
          organizationId: target.organizationId,
          propertyId: target.propertyId,
          status: "FAILED",
          error: message,
        });
      }
    }

    if (properties.length > 0) {
      await this.audit.record({
        organizationId: properties[0]?.organizationId ?? "system",
        userId: actorUserId,
        action: "banking.statement.restPollSync",
        entityType: "JobRun",
        metadata: {
          itemCount: properties.length,
          succeeded: properties.filter((row) => row.status === "SUCCEEDED").length,
          failed: properties.filter((row) => row.status === "FAILED").length,
        },
      });
    }

    return { properties };
  }

  async rotateWebhookSecret(ctx: BankingContext): Promise<RotateBankWebhookSecretResult> {
    await this.assertContext(ctx);
    const webhookSecret = generateWebhookSecret();
    const profile = await this.repository.rotateWebhookSecret(ctx, hashWebhookSecret(webhookSecret));

    await this.audit.record({
      organizationId: ctx.organizationId,
      userId: ctx.actorUserId,
      action: "banking.webhookProfile.rotateSecret",
      entityType: "PropertyBankWebhookProfile",
      entityId: ctx.propertyId,
    });

    return { profile, webhookSecret };
  }

  async listImports(ctx: BankingContext, year: number, month: number): Promise<BankStatementImportDto[]> {
    await this.assertContext(ctx);
    const rows = await this.repository.listImports(ctx, year, month);
    return rows.map(mapImport);
  }

  async listUnmatchedLines(input: ListUnmatchedLinesInput): Promise<PaginatedBankLines> {
    await this.assertContext(input);
    const result = await this.repository.listUnmatchedLines(input);
    return {
      items: result.items.map(mapLine),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  async runAutoMatch(ctx: BankingContext, importId: string): Promise<{ matched: number }> {
    await this.assertContext(ctx);
    const imp = await this.repository.getImport(ctx, importId);
    if (!imp) throw new Error("IMPORT_NOT_FOUND");

    const lines = await this.repository.listUnmatchedByImport(importId);
    let matched = 0;

    for (const line of lines) {
      const amount = line.amount;
      const payment = await this.repository.findPaymentMatch(imp.cashboxId, amount, line.lineDate);
      if (payment) {
        await this.repository.markLineMatched(line.id, { paymentId: payment.id });
        matched += 1;
        continue;
      }

      const movement = await this.repository.findMovementMatch(imp.cashboxId, amount, line.lineDate);
      if (movement) {
        await this.repository.markLineMatched(line.id, { cashboxMovementId: movement.id });
        matched += 1;
      }
    }

    if (matched > 0) {
      await this.repository.updateImportMatchedCount(importId);
      await this.audit.record({
        organizationId: ctx.organizationId,
        userId: ctx.actorUserId,
        action: "banking.statement.autoMatch",
        entityType: "BankStatementImport",
        entityId: importId,
        metadata: { matched },
      });
    }

    return { matched };
  }

  async ignoreLine(ctx: BankingContext, lineId: string): Promise<void> {
    await this.assertContext(ctx);
    const line = await this.repository.getLine(ctx, lineId);
    if (!line) throw new Error("LINE_NOT_FOUND");

    const importId = await this.repository.ignoreLine(ctx, lineId);
    if (importId) {
      await this.repository.updateImportMatchedCount(importId);
    }

    await this.audit.record({
      organizationId: ctx.organizationId,
      userId: ctx.actorUserId,
      action: "banking.statement.ignoreLine",
      entityType: "BankStatementLine",
      entityId: lineId,
    });
  }

  async matchLineAsStaffMovement(input: MatchLineAsStaffMovementInput): Promise<void> {
    await this.assertContext(input);
    const allowedStaffMovements: StaffMovementType[] = [StaffMovementType.ADVANCE, StaffMovementType.PAYMENT];
    if (!allowedStaffMovements.includes(input.movementType)) {
      throw new Error("BANK_STAFF_MOVEMENT_TYPE_INVALID");
    }

    const line = await this.repository.getLineWithImport(input, input.lineId);
    if (!line) throw new Error("LINE_NOT_FOUND");
    if (line.matchStatus !== BankStatementMatchStatus.UNMATCHED) {
      throw new Error("LINE_ALREADY_MATCHED");
    }

    const movement = await this.staffFinance.recordMovement({
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      actorUserId: input.actorUserId,
      staffProfileId: input.staffProfileId,
      movementType: input.movementType,
      categoryId: input.categoryId,
      cashboxId: line.import.cashboxId,
      amount: line.amount.toString(),
      movementDate: line.lineDate,
      documentNo: line.reference,
      description: input.description?.trim() || line.description,
    });
    if (!movement.ledgerEntryId) throw new Error("STAFF_MOVEMENT_LEDGER_NOT_FOUND");

    const cashboxMovement = await this.repository.findCashboxMovementByLedgerEntryId(movement.ledgerEntryId);
    if (!cashboxMovement) throw new Error("CASHBOX_MOVEMENT_NOT_FOUND");

    await this.repository.markLineMatched(input.lineId, { cashboxMovementId: cashboxMovement.id });
    await this.repository.updateImportMatchedCount(line.importId);

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "banking.statement.matchStaffMovement",
      entityType: "BankStatementLine",
      entityId: input.lineId,
      metadata: {
        staffProfileId: input.staffProfileId,
        movementType: input.movementType,
        amount: line.amount.toString(),
        staffMovementId: movement.id,
        cashboxMovementId: cashboxMovement.id,
      },
    });
  }

  async buildReconciliationSummary(
    ctx: BankingContext,
    year: number,
    month: number,
  ): Promise<BankReconciliationSummaryDto> {
    await this.assertContext(ctx);
    const lines = await this.repository.listLinesForPeriod(ctx, year, month);

    let matchedLines = 0;
    let unmatchedLines = 0;
    let ignoredLines = 0;
    let unmatchedAmountTotal = new Prisma.Decimal(0);

    const rows = lines.map((line) => {
      if (line.matchStatus === BankStatementMatchStatus.MATCHED) matchedLines += 1;
      else if (line.matchStatus === BankStatementMatchStatus.IGNORED) ignoredLines += 1;
      else {
        unmatchedLines += 1;
        unmatchedAmountTotal = unmatchedAmountTotal.add(line.amount);
      }

      return {
        lineDate: line.lineDate.toISOString().slice(0, 10),
        cashboxName: line.import.cashbox.name,
        amount: line.amount.toString(),
        description: line.description,
        matchStatus: line.matchStatus,
        matchedTarget: matchedTargetLabel(line),
      };
    });

    return {
      year,
      month,
      totalLines: lines.length,
      matchedLines,
      unmatchedLines,
      ignoredLines,
      unmatchedAmountTotal: unmatchedAmountTotal.toString(),
      rows,
    };
  }
}

export function createBankingService() {
  return new BankingService();
}
