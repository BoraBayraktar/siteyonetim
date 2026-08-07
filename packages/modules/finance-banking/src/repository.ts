import { BankStatementImportSource, BankStatementMatchStatus, BankSyncProviderKind, Prisma, prisma } from "@siteyonetim/db";

import type {
  BankingContext,
  BankRestPollSyncTarget,
  ListUnmatchedLinesInput,
  PropertyBankWebhookProfileDto,
} from "./contract";

const MATCH_DAY_TOLERANCE = 3;

function periodRange(year: number, month: number) {
  if (month === 0) {
    return {
      from: new Date(year, 0, 1),
      to: new Date(year, 11, 31, 23, 59, 59, 999),
    };
  }
  return {
    from: new Date(year, month - 1, 1),
    to: new Date(year, month, 0, 23, 59, 59, 999),
  };
}

export class BankingRepository {
  async assertProperty(organizationId: string, propertyId: string) {
    const row = await prisma.property.findFirst({
      where: { id: propertyId, organizationId, deleted: false },
      select: { id: true },
    });
    return Boolean(row);
  }

  async assertCashbox(ctx: BankingContext, cashboxId: string) {
    return prisma.cashbox.findFirst({
      where: {
        id: cashboxId,
        organizationId: ctx.organizationId,
        propertyId: ctx.propertyId,
        deleted: false,
      },
      select: { id: true, name: true },
    });
  }

  async createImport(
    ctx: BankingContext,
    data: {
      cashboxId: string;
      fileName: string;
      source: BankStatementImportSource;
      year: number;
      month: number;
      lineCount: number;
    },
  ) {
    return prisma.bankStatementImport.create({
      data: {
        organizationId: ctx.organizationId,
        propertyId: ctx.propertyId,
        cashboxId: data.cashboxId,
        fileName: data.fileName,
        source: data.source,
        year: data.year,
        month: data.month,
        lineCount: data.lineCount,
        importedByUserId: ctx.actorUserId ?? null,
      },
      include: { cashbox: { select: { name: true } } },
    });
  }

  async createLines(
    importId: string,
    lines: { lineDate: Date; amount: string; description: string | null; reference: string | null }[],
  ) {
    await prisma.bankStatementLine.createMany({
      data: lines.map((line) => ({
        importId,
        lineDate: line.lineDate,
        amount: new Prisma.Decimal(line.amount),
        description: line.description,
        reference: line.reference,
      })),
    });
  }

  async getImport(ctx: BankingContext, importId: string) {
    return prisma.bankStatementImport.findFirst({
      where: {
        id: importId,
        organizationId: ctx.organizationId,
        propertyId: ctx.propertyId,
        deleted: false,
      },
      include: { cashbox: { select: { name: true } } },
    });
  }

  async listImports(ctx: BankingContext, year: number, month: number) {
    return prisma.bankStatementImport.findMany({
      where: {
        organizationId: ctx.organizationId,
        propertyId: ctx.propertyId,
        year,
        month,
        deleted: false,
      },
      include: { cashbox: { select: { name: true } } },
      orderBy: { importedAt: "desc" },
    });
  }

  async listUnmatchedLines(input: ListUnmatchedLinesInput) {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    const { from, to } = periodRange(input.year, input.month);

    const where = {
      deleted: false,
      matchStatus: BankStatementMatchStatus.UNMATCHED,
      lineDate: { gte: from, lte: to },
      import: {
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        deleted: false,
      },
    };

    const [items, total] = await Promise.all([
      prisma.bankStatementLine.findMany({
        where,
        include: {
          import: { include: { cashbox: { select: { name: true } } } },
          matchedPayment: { select: { documentNo: true, description: true } },
          matchedCashboxMovement: {
            select: {
              description: true,
              ledgerEntry: {
                select: {
                  staffMovements: {
                    where: { deleted: false },
                    select: {
                      movementType: true,
                      staffProfile: {
                        select: { party: { select: { displayName: true } } },
                      },
                    },
                    take: 1,
                  },
                },
              },
            },
          },
        },
        orderBy: [{ lineDate: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.bankStatementLine.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async listLinesForPeriod(ctx: BankingContext, year: number, month: number) {
    const { from, to } = periodRange(year, month);
    return prisma.bankStatementLine.findMany({
      where: {
        deleted: false,
        lineDate: { gte: from, lte: to },
        import: {
          organizationId: ctx.organizationId,
          propertyId: ctx.propertyId,
          deleted: false,
        },
      },
      include: {
        import: { include: { cashbox: { select: { name: true } } } },
        matchedPayment: { select: { documentNo: true, description: true } },
        matchedCashboxMovement: {
          select: {
            description: true,
            ledgerEntry: {
              select: {
                staffMovements: {
                  where: { deleted: false },
                  select: {
                    movementType: true,
                    staffProfile: {
                      select: { party: { select: { displayName: true } } },
                    },
                  },
                  take: 1,
                },
              },
            },
          },
        },
      },
      orderBy: [{ lineDate: "asc" }, { createdAt: "asc" }],
    });
  }

  async listUnmatchedByImport(importId: string) {
    return prisma.bankStatementLine.findMany({
      where: {
        importId,
        deleted: false,
        matchStatus: BankStatementMatchStatus.UNMATCHED,
      },
      orderBy: { lineDate: "asc" },
    });
  }

  async findPaymentMatch(cashboxId: string, amount: Prisma.Decimal, lineDate: Date) {
    const from = new Date(lineDate);
    from.setDate(from.getDate() - MATCH_DAY_TOLERANCE);
    const to = new Date(lineDate);
    to.setDate(to.getDate() + MATCH_DAY_TOLERANCE);

    return prisma.payment.findFirst({
      where: {
        cashboxId,
        deleted: false,
        amount,
        paymentDate: { gte: from, lte: to },
        bankStatementMatches: { none: { deleted: false, matchStatus: BankStatementMatchStatus.MATCHED } },
      },
      orderBy: { paymentDate: "asc" },
    });
  }

  async findMovementMatch(cashboxId: string, amount: Prisma.Decimal, lineDate: Date) {
    const from = new Date(lineDate);
    from.setDate(from.getDate() - MATCH_DAY_TOLERANCE);
    const to = new Date(lineDate);
    to.setDate(to.getDate() + MATCH_DAY_TOLERANCE);

    return prisma.cashboxMovement.findFirst({
      where: {
        cashboxId,
        deleted: false,
        amount,
        movementDate: { gte: from, lte: to },
        bankStatementMatches: { none: { deleted: false, matchStatus: BankStatementMatchStatus.MATCHED } },
      },
      orderBy: { movementDate: "asc" },
    });
  }

  async markLineMatched(
    lineId: string,
    target: { paymentId: string } | { cashboxMovementId: string },
  ) {
    return prisma.bankStatementLine.update({
      where: { id: lineId },
      data: {
        matchStatus: BankStatementMatchStatus.MATCHED,
        matchedAt: new Date(),
        matchedPaymentId: "paymentId" in target ? target.paymentId : null,
        matchedCashboxMovementId: "cashboxMovementId" in target ? target.cashboxMovementId : null,
      },
    });
  }

  async updateImportMatchedCount(importId: string) {
    const matchedCount = await prisma.bankStatementLine.count({
      where: {
        importId,
        deleted: false,
        matchStatus: BankStatementMatchStatus.MATCHED,
      },
    });
    return prisma.bankStatementImport.update({
      where: { id: importId },
      data: { matchedCount },
      include: { cashbox: { select: { name: true } } },
    });
  }

  async ignoreLine(ctx: BankingContext, lineId: string) {
    const line = await prisma.bankStatementLine.findFirst({
      where: {
        id: lineId,
        deleted: false,
        import: {
          organizationId: ctx.organizationId,
          propertyId: ctx.propertyId,
          deleted: false,
        },
      },
      select: { id: true, importId: true },
    });
    if (!line) return null;

    await prisma.bankStatementLine.update({
      where: { id: lineId },
      data: { matchStatus: BankStatementMatchStatus.IGNORED },
    });
    return line.importId;
  }

  async getLine(ctx: BankingContext, lineId: string) {
    return prisma.bankStatementLine.findFirst({
      where: {
        id: lineId,
        deleted: false,
        import: {
          organizationId: ctx.organizationId,
          propertyId: ctx.propertyId,
          deleted: false,
        },
      },
    });
  }

  async getLineWithImport(ctx: BankingContext, lineId: string) {
    return prisma.bankStatementLine.findFirst({
      where: {
        id: lineId,
        deleted: false,
        import: {
          organizationId: ctx.organizationId,
          propertyId: ctx.propertyId,
          deleted: false,
        },
      },
      include: {
        import: { select: { id: true, cashboxId: true } },
      },
    });
  }

  async findCashboxMovementByLedgerEntryId(ledgerEntryId: string) {
    return prisma.cashboxMovement.findFirst({
      where: { ledgerEntryId, deleted: false },
      select: { id: true },
    });
  }

  private mapWebhookProfile(row: {
    propertyId: string;
    enabled: boolean;
    providerKind: BankSyncProviderKind;
    cashboxId: string | null;
    pollUrl: string | null;
    webhookSecretHash: string | null;
    restPollBearerToken: string | null;
    lastReceivedAt: Date | null;
    lastPollAt: Date | null;
  }): PropertyBankWebhookProfileDto {
    return {
      propertyId: row.propertyId,
      enabled: row.enabled,
      providerKind: row.providerKind,
      cashboxId: row.cashboxId,
      pollUrl: row.pollUrl,
      hasSecret: Boolean(row.webhookSecretHash),
      hasPollToken: Boolean(row.restPollBearerToken),
      lastReceivedAt: row.lastReceivedAt,
      lastPollAt: row.lastPollAt,
    };
  }

  async getWebhookProfile(ctx: BankingContext): Promise<PropertyBankWebhookProfileDto | null> {
    const row = await prisma.propertyBankWebhookProfile.findFirst({
      where: {
        propertyId: ctx.propertyId,
        organizationId: ctx.organizationId,
        deleted: false,
      },
    });
    return row ? this.mapWebhookProfile(row) : null;
  }

  async getWebhookProfileByPropertyId(propertyId: string) {
    return prisma.propertyBankWebhookProfile.findFirst({
      where: { propertyId, deleted: false, enabled: true },
    });
  }

  async upsertWebhookProfile(
    ctx: BankingContext,
    data: {
      enabled: boolean;
      providerKind: BankSyncProviderKind;
      cashboxId: string | null;
      pollUrl?: string | null;
      restPollBearerToken?: string | null;
    },
  ): Promise<PropertyBankWebhookProfileDto> {
    const existing = await prisma.propertyBankWebhookProfile.findUnique({
      where: { propertyId: ctx.propertyId },
    });

    const pollUrl = data.pollUrl !== undefined ? data.pollUrl?.trim() || null : existing?.pollUrl ?? null;
    const restPollBearerToken =
      data.restPollBearerToken !== undefined
        ? data.restPollBearerToken?.trim() || null
        : existing?.restPollBearerToken ?? null;

    const row = await prisma.propertyBankWebhookProfile.upsert({
      where: { propertyId: ctx.propertyId },
      create: {
        organizationId: ctx.organizationId,
        propertyId: ctx.propertyId,
        enabled: data.enabled,
        providerKind: data.providerKind,
        cashboxId: data.cashboxId,
        pollUrl,
        restPollBearerToken,
      },
      update: {
        enabled: data.enabled,
        providerKind: data.providerKind,
        cashboxId: data.cashboxId,
        pollUrl,
        restPollBearerToken,
        deleted: false,
        deletedDate: null,
        deletedUserId: null,
      },
    });
    return this.mapWebhookProfile(row);
  }

  async rotateWebhookSecret(ctx: BankingContext, secretHash: string): Promise<PropertyBankWebhookProfileDto> {
    const row = await prisma.propertyBankWebhookProfile.upsert({
      where: { propertyId: ctx.propertyId },
      create: {
        organizationId: ctx.organizationId,
        propertyId: ctx.propertyId,
        enabled: false,
        webhookSecretHash: secretHash,
      },
      update: {
        webhookSecretHash: secretHash,
        deleted: false,
        deletedDate: null,
        deletedUserId: null,
      },
    });
    return this.mapWebhookProfile(row);
  }

  async touchWebhookReceived(propertyId: string) {
    await prisma.propertyBankWebhookProfile.updateMany({
      where: { propertyId, deleted: false },
      data: { lastReceivedAt: new Date() },
    });
  }

  async touchPollReceived(propertyId: string) {
    await prisma.propertyBankWebhookProfile.updateMany({
      where: { propertyId, deleted: false },
      data: { lastPollAt: new Date(), lastReceivedAt: new Date() },
    });
  }

  async listRestPollTargets(): Promise<BankRestPollSyncTarget[]> {
    const rows = await prisma.propertyBankWebhookProfile.findMany({
      where: {
        deleted: false,
        enabled: true,
        providerKind: BankSyncProviderKind.GENERIC_REST_POLL,
        pollUrl: { not: null },
        restPollBearerToken: { not: null },
        cashboxId: { not: null },
      },
      select: {
        organizationId: true,
        propertyId: true,
        cashboxId: true,
        pollUrl: true,
        restPollBearerToken: true,
      },
    });

    return rows
      .filter(
        (row): row is typeof row & { cashboxId: string; pollUrl: string; restPollBearerToken: string } =>
          Boolean(row.cashboxId && row.pollUrl && row.restPollBearerToken),
      )
      .map((row) => ({
        organizationId: row.organizationId,
        propertyId: row.propertyId,
        cashboxId: row.cashboxId,
        pollUrl: row.pollUrl,
        restPollBearerToken: row.restPollBearerToken,
      }));
  }
}
