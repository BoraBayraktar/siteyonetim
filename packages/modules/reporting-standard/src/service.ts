import { Prisma, PropertyKind, ReportExportFormat, LedgerEntryType } from "@siteyonetim/db";
import type { NotificationServiceContract } from "@siteyonetim/comm-notifications";
import { createNotificationService } from "@siteyonetim/comm-notifications";
import type { ReportingCoreContract } from "@siteyonetim/reporting-core";
import { contentTypeForFormat, createReportingCoreService, extensionForFormat } from "@siteyonetim/reporting-core";
import { createAuditService } from "@siteyonetim/platform-audit";
import { createLocalFileStorage } from "@siteyonetim/platform-files";

import type {
  AnnualIncomeExpenseReport,
  CashboxSummaryReport,
  DebtAgingReport,
  DueAccrualSummaryReport,
  DueCollectionReport,
  ExpenseBreakdownReport,
  ProcessPendingExportsResult,
  PortalIncomeExpenseInput,
  PortalIncomeExpenseSummaryDto,
  PropertyDashboardDto,
  PropertyInfoDto,
  PropertySetupStatusDto,
  PropertySetupStepDto,
  PropertySetupStepId,
  ReportExportDto,
  ReportFilter,
  RequestReportExportInput,
  StandardReportKind,
  StandardReportingContract,
} from "./contract";
import { isAnnualReportKind } from "./contract";
import { buildAuditPackageZip } from "./audit-package";
import { buildAuditorReportDocument } from "./auditor-report-builder";
import { sortByUnitCode } from "./unit-sort";
import { ReportExportRepository } from "./export-repository";
import { buildReportTableDocument } from "./report-document";
import { StandardReportRepository } from "./repository";

function dueDate(year: number, month: number, dueDayOfMonth: number) {
  const lastDay = new Date(year, month, 0).getDate();
  const day = Math.min(Math.max(dueDayOfMonth, 1), lastDay);
  return new Date(year, month - 1, day);
}

function daysOverdue(accrualYear: number, accrualMonth: number, dueDayOfMonth: number, now = new Date()) {
  const due = dueDate(accrualYear, accrualMonth, dueDayOfMonth);
  const diff = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

async function loadReportData(
  service: StandardReportingService,
  kind: StandardReportKind,
  filter: ReportFilter,
) {
  switch (kind) {
    case "DUE_ACCRUAL_SUMMARY":
      return { accrual: await service.dueAccrualSummary(filter) };
    case "DUE_COLLECTION":
      return { collection: await service.dueCollection(filter) };
    case "EXPENSE_BREAKDOWN":
      return { expense: await service.expenseBreakdown(filter) };
    case "CASHBOX_SUMMARY":
      return { cashbox: await service.cashboxSummary(filter) };
    case "DEBT_AGING":
      return { aging: await service.debtAging(filter) };
    case "ANNUAL_INCOME_EXPENSE":
      return { annual: await service.annualIncomeExpense(filter) };
    default:
      throw new Error("REPORT_KIND_UNKNOWN");
  }
}

export class StandardReportingService implements StandardReportingContract {
  private readonly repository = new StandardReportRepository();
  private readonly exportRepository = new ReportExportRepository();
  private readonly files = createLocalFileStorage();
  private readonly audit = createAuditService();
  private readonly notifications: NotificationServiceContract;
  private readonly reportingCore: ReportingCoreContract;

  constructor(
    notifications: NotificationServiceContract = createNotificationService(),
    reportingCore: ReportingCoreContract = createReportingCoreService(),
  ) {
    this.notifications = notifications;
    this.reportingCore = reportingCore;
  }

  private async buildDocument(kind: StandardReportKind, filter: ReportFilter) {
    await this.assertFilter(filter);
    const data = await loadReportData(this, kind, filter);
    return buildReportTableDocument(kind, filter, data);
  }

  private async assertFilter(filter: ReportFilter) {
    if (filter.month !== 0 && (filter.month < 1 || filter.month > 12)) {
      throw new Error("INVALID_MONTH");
    }
    const ok = await this.repository.assertProperty(filter.organizationId, filter.propertyId);
    if (!ok) throw new Error("PROPERTY_NOT_FOUND");
  }

  async dueAccrualSummary(filter: ReportFilter): Promise<DueAccrualSummaryReport> {
    await this.assertFilter(filter);
    const lines = await this.repository.dueAccrualLines(filter);
    let total = new Prisma.Decimal(0);
    const rows = lines.map((line) => {
      total = total.add(line.amount);
      return {
        unitCode: line.unit.code,
        blockName: line.unit.block?.name ?? null,
        definitionName: line.accrualRun.dueDefinition.name,
        lineKind: line.lineKind,
        amount: line.amount.toString(),
      };
    });
    return { rows, totalAccrued: total.toString() };
  }

  async dueCollection(filter: ReportFilter): Promise<DueCollectionReport> {
    await this.assertFilter(filter);
    const payments = await this.repository.duePayments(filter);
    let total = new Prisma.Decimal(0);
    const rows = payments.map((p) => {
      total = total.add(p.amount);
      return {
        paymentDate: p.paymentDate.toISOString().slice(0, 10),
        partyName: p.party?.displayName ?? null,
        amount: p.amount.toString(),
        documentNo: p.documentNo,
        description: p.description,
      };
    });
    return { rows, totalCollected: total.toString() };
  }

  async expenseBreakdown(filter: ReportFilter): Promise<ExpenseBreakdownReport> {
    await this.assertFilter(filter);
    const grouped = await this.repository.expenseByCategory(filter);
    let total = new Prisma.Decimal(0);
    const rows = grouped
      .map((g) => {
        total = total.add(g.amount);
        return { categoryName: g.categoryName, amount: g.amount.toString() };
      })
      .sort((a, b) => a.categoryName.localeCompare(b.categoryName));
    return { rows, totalExpense: total.toString() };
  }

  async cashboxSummary(filter: ReportFilter): Promise<CashboxSummaryReport> {
    await this.assertFilter(filter);
    const boxes = await this.repository.cashboxes(filter);
    let total = new Prisma.Decimal(0);
    const rows = boxes.map((c) => {
      total = total.add(c.balance);
      return { name: c.name, balance: c.balance.toString() };
    });
    return { rows, totalBalance: total.toString() };
  }

  async debtAging(filter: ReportFilter): Promise<DebtAgingReport> {
    await this.assertFilter(filter);
    const dueDay = await this.repository.getLateFeeDueDay(filter);
    const lines = await this.repository.openDebtLines(filter);
    const byUnit = new Map<
      string,
      DebtAgingReport["rows"][number] & {
        _b0: Prisma.Decimal;
        _b1: Prisma.Decimal;
        _b2: Prisma.Decimal;
      }
    >();

    for (const line of lines) {
      const remaining = line.amount.sub(line.paidAmount);
      if (remaining.lte(0)) continue;

      const overdue = daysOverdue(line.accrualRun.year, line.accrualRun.month, dueDay);
      let b0 = new Prisma.Decimal(0);
      let b1 = new Prisma.Decimal(0);
      let b2 = new Prisma.Decimal(0);
      if (overdue <= 30) b0 = remaining;
      else if (overdue <= 60) b1 = remaining;
      else b2 = remaining;

      const key = line.unit.id;
      const existing = byUnit.get(key);
      if (!existing) {
        byUnit.set(key, {
          unitCode: line.unit.code,
          blockName: line.unit.block?.name ?? null,
          partyName: line.party?.displayName ?? null,
          totalDebt: remaining.toString(),
          aging0To30: b0.toString(),
          aging31To60: b1.toString(),
          aging61Plus: b2.toString(),
          _b0: b0,
          _b1: b1,
          _b2: b2,
        });
      } else {
        existing._b0 = existing._b0.add(b0);
        existing._b1 = existing._b1.add(b1);
        existing._b2 = existing._b2.add(b2);
        const sum = existing._b0.add(existing._b1).add(existing._b2);
        existing.totalDebt = sum.toString();
        existing.aging0To30 = existing._b0.toString();
        existing.aging31To60 = existing._b1.toString();
        existing.aging61Plus = existing._b2.toString();
      }
    }

    const rows = sortByUnitCode(
      [...byUnit.values()].map(({ _b0: _a, _b1: _b, _b2: _c, ...rest }) => rest),
    );

    const totalDebt = rows.reduce((acc, r) => acc.add(new Prisma.Decimal(r.totalDebt)), new Prisma.Decimal(0));
    return { rows, totalDebt: totalDebt.toString() };
  }

  async propertyInfo(organizationId: string, propertyId: string): Promise<PropertyInfoDto> {
    const row = await this.repository.getPropertyInfo(organizationId, propertyId);
    if (!row) throw new Error("PROPERTY_NOT_FOUND");
    return {
      id: row.id,
      name: row.name,
      address: row.address,
      organizationName: row.organization.name,
    };
  }

  async annualIncomeExpense(filter: ReportFilter): Promise<AnnualIncomeExpenseReport> {
    await this.assertFilter(filter);
    const property = await this.propertyInfo(filter.organizationId, filter.propertyId);

    const [dueCollectionTotal, incomeRows, expenseRows, budget, cashbox, aging] = await Promise.all([
      this.repository.duePaymentsYear(filter),
      this.repository.ledgerByCategoryYear(filter, LedgerEntryType.INCOME),
      this.repository.ledgerByCategoryYear(filter, LedgerEntryType.EXPENSE),
      this.repository.getOperatingBudgetLines(filter),
      this.cashboxSummary({ ...filter, month: 12 }),
      this.debtAging({ ...filter, month: 12 }),
    ]);

    const ledgerIncomeTotal = incomeRows.reduce(
      (sum, row) => sum.add(row.amount),
      new Prisma.Decimal(0),
    );
    const ledgerExpenseTotal = expenseRows.reduce(
      (sum, row) => sum.add(row.amount),
      new Prisma.Decimal(0),
    );
    const totalIncome = dueCollectionTotal.add(ledgerIncomeTotal);
    const totalExpense = ledgerExpenseTotal;
    const netResult = totalIncome.sub(totalExpense);

    const actualByCategoryId = new Map<string, Prisma.Decimal>();
    for (const row of [...incomeRows, ...expenseRows]) {
      actualByCategoryId.set(row.categoryId, row.amount);
    }

    const rows: AnnualIncomeExpenseReport["rows"] = [
      {
        label: filter.locale === "en" ? "Dues & collections" : "Aidat ve tahsilat",
        section: "INCOME",
        amount: dueCollectionTotal.toString(),
      },
      ...incomeRows.map((row) => ({
        label: row.categoryName,
        section: "INCOME" as const,
        amount: row.amount.toString(),
      })),
      {
        label: filter.locale === "en" ? "Total income" : "Toplam gelir",
        section: "SUMMARY",
        amount: totalIncome.toString(),
      },
      ...expenseRows.map((row) => ({
        label: row.categoryName,
        section: "EXPENSE" as const,
        amount: row.amount.toString(),
      })),
      {
        label: filter.locale === "en" ? "Total expense" : "Toplam gider",
        section: "SUMMARY",
        amount: totalExpense.toString(),
      },
      {
        label: filter.locale === "en" ? "Net result" : "Donem farki",
        section: "SUMMARY",
        amount: netResult.toString(),
      },
    ];

    let budgetPlannedTotal: Prisma.Decimal | null = null;
    let budgetActualTotal: Prisma.Decimal | null = null;

    if (budget) {
      budgetPlannedTotal = new Prisma.Decimal(0);
      budgetActualTotal = new Prisma.Decimal(0);
      for (const line of budget.lines) {
        const planned = line.plannedAmount;
        const actual = actualByCategoryId.get(line.categoryId) ?? new Prisma.Decimal(0);
        const variance = planned.sub(actual);
        budgetPlannedTotal = budgetPlannedTotal.add(planned);
        budgetActualTotal = budgetActualTotal.add(actual);
        rows.push({
          label: line.category.name,
          section: "BUDGET",
          amount: actual.toString(),
          plannedAmount: planned.toString(),
          variance: variance.toString(),
        });
      }
    }

    return {
      year: filter.year,
      propertyName: property.name,
      rows,
      totalIncome: totalIncome.toString(),
      totalExpense: totalExpense.toString(),
      netResult: netResult.toString(),
      dueCollectionTotal: dueCollectionTotal.toString(),
      openDebtTotal: aging.totalDebt,
      cashboxBalance: cashbox.totalBalance,
      budgetPlannedTotal: budgetPlannedTotal?.toString() ?? null,
      budgetActualTotal: budgetActualTotal?.toString() ?? null,
    };
  }

  async getPortalIncomeExpenseSummary(
    input: PortalIncomeExpenseInput,
  ): Promise<PortalIncomeExpenseSummaryDto> {
    const year = input.year ?? new Date().getFullYear();
    const [report, expenseBreakdown] = await Promise.all([
      this.annualIncomeExpense({
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        year,
        month: 0,
        locale: input.locale,
      }),
      this.expenseBreakdown({
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        year,
        month: 0,
        locale: input.locale,
      }),
    ]);

    return {
      propertyId: input.propertyId,
      propertyName: report.propertyName,
      year: report.year,
      totalIncome: report.totalIncome,
      totalExpense: report.totalExpense,
      netResult: report.netResult,
      dueCollectionTotal: report.dueCollectionTotal,
      expenseRows: expenseBreakdown.rows,
    };
  }

  async propertyDashboard(filter: ReportFilter): Promise<PropertyDashboardDto> {
    await this.assertFilter(filter);

    const [accrual, collection, cashbox, aging] = await Promise.all([
      this.dueAccrualSummary(filter),
      this.dueCollection(filter),
      this.cashboxSummary(filter),
      this.debtAging(filter),
    ]);

    const overdueUnitCount = aging.rows.filter((row) => {
      const overdue = new Prisma.Decimal(row.aging31To60).add(new Prisma.Decimal(row.aging61Plus));
      return overdue.gt(0);
    }).length;

    const topDebtors = aging.rows
      .filter((row) => new Prisma.Decimal(row.totalDebt).gt(0))
      .sort((a, b) => Number(b.totalDebt) - Number(a.totalDebt))
      .slice(0, 5)
      .map((row) => ({
        unitCode: row.unitCode,
        blockName: row.blockName,
        partyName: row.partyName,
        totalDebt: row.totalDebt,
        aging61Plus: row.aging61Plus,
      }));

    return {
      year: filter.year,
      month: filter.month,
      totalDebt: aging.totalDebt,
      overdueUnitCount,
      monthlyAccrued: accrual.totalAccrued,
      monthlyCollected: collection.totalCollected,
      cashboxBalance: cashbox.totalBalance,
      topDebtors,
    };
  }

  async propertySetupStatus(organizationId: string, propertyId: string): Promise<PropertySetupStatusDto> {
    const ok = await this.repository.assertProperty(organizationId, propertyId);
    if (!ok) throw new Error("PROPERTY_NOT_FOUND");

    const counts = await this.repository.propertySetupCounts(organizationId, propertyId);
    const blocksComplete =
      counts.propertyKind === PropertyKind.APARTMAN
        ? counts.blockCount > 0 || counts.unitCount > 0
        : counts.blockCount > 0;
    const unitsComplete = counts.unitCount > 0;
    const occupancyComplete =
      counts.unitCount > 0 && counts.unitsWithOccupancy >= counts.unitCount;
    const definitionsComplete = counts.definitionCount > 0;
    const cashboxComplete = counts.cashboxCount > 0;
    const accrualComplete = counts.postedAccrualCount > 0;

    const steps: PropertySetupStepDto[] = [
      {
        id: "BLOCKS",
        complete: blocksComplete,
        current: counts.blockCount,
        target: counts.propertyKind === PropertyKind.APARTMAN_SITE ? 1 : 0,
      },
      {
        id: "UNITS",
        complete: unitsComplete,
        current: counts.unitCount,
        target: 1,
      },
      {
        id: "PARTIES_OCCUPANCY",
        complete: occupancyComplete,
        current: counts.unitsWithOccupancy,
        target: counts.unitCount,
      },
      {
        id: "DUES_DEFINITIONS",
        complete: definitionsComplete,
        current: counts.definitionCount,
        target: 1,
      },
      {
        id: "CASHBOX",
        complete: cashboxComplete,
        current: counts.cashboxCount,
        target: 1,
      },
      {
        id: "FIRST_ACCRUAL",
        complete: accrualComplete,
        current: counts.postedAccrualCount,
        target: 1,
      },
    ];

    const completedCount = steps.filter((step) => step.complete).length;

    return {
      propertyId,
      steps,
      completedCount,
      totalCount: steps.length,
      isComplete: completedCount === steps.length,
    };
  }

  async exportCsv(kind: StandardReportKind, filter: ReportFilter): Promise<string> {
    const rendered = await this.exportReportFile(kind, filter, ReportExportFormat.CSV);
    return rendered.buffer.toString("utf-8");
  }

  async exportReportFile(
    kind: StandardReportKind,
    filter: ReportFilter,
    format: ReportExportFormat,
  ) {
    await this.assertFilter(filter);

    if (kind === "AUDITOR_REPORT_TEMPLATE") {
      const [property, annual] = await Promise.all([
        this.propertyInfo(filter.organizationId, filter.propertyId),
        this.annualIncomeExpense(filter),
      ]);
      const document = buildAuditorReportDocument({ filter, property, annual });
      const rendered = await this.reportingCore.renderAuditorTemplate(document);
      await this.audit.record({
        organizationId: filter.organizationId,
        userId: filter.actorUserId,
        action: "reporting.exportFile",
        entityType: "StandardReport",
        metadata: { kind, format: "PDF", year: filter.year },
      });
      return rendered;
    }

    if (kind === "AUDIT_PACKAGE") {
      const rendered = await buildAuditPackageZip(filter, (k, f, fmt) => this.exportReportFile(k, f, fmt), this.reportingCore);
      await this.audit.record({
        organizationId: filter.organizationId,
        userId: filter.actorUserId,
        action: "reporting.exportFile",
        entityType: "StandardReport",
        metadata: { kind, format: "ZIP", year: filter.year },
      });
      return rendered;
    }

    const document = await this.buildDocument(kind, filter);
    const rendered = await this.reportingCore.render(format, document);

    await this.audit.record({
      organizationId: filter.organizationId,
      userId: filter.actorUserId,
      action: "reporting.exportFile",
      entityType: "StandardReport",
      metadata: {
        kind,
        format,
        year: filter.year,
        month: filter.month,
        blockId: filter.blockId ?? null,
      },
    });

    return rendered;
  }

  private mapExport(row: {
    id: string;
    reportKind: string;
    format: ReportExportFormat;
    year: number;
    month: number;
    blockId: string | null;
    status: string;
    errorMessage: string | null;
    createdAt: Date;
    completedAt: Date | null;
  }): ReportExportDto {
    return {
      id: row.id,
      reportKind: row.reportKind as StandardReportKind,
      format: row.format,
      year: row.year,
      month: row.month,
      blockId: row.blockId,
      status: row.status as ReportExportDto["status"],
      errorMessage: row.errorMessage,
      createdAt: row.createdAt,
      completedAt: row.completedAt,
    };
  }

  async requestReportExport(input: RequestReportExportInput): Promise<ReportExportDto> {
    await this.assertFilter(input);
    const defaultFormat =
      input.reportKind === "AUDIT_PACKAGE"
        ? ReportExportFormat.ZIP
        : input.reportKind === "AUDITOR_REPORT_TEMPLATE"
          ? ReportExportFormat.PDF
          : ReportExportFormat.CSV;
    const created = await this.exportRepository.create({
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      reportKind: input.reportKind,
      format: input.format ?? defaultFormat,
      year: input.year,
      month: input.month,
      blockId: input.blockId,
      requestedByUserId: input.actorUserId ?? null,
    });
    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "reporting.export.request",
      entityType: "ReportExport",
      entityId: created.id,
      metadata: { kind: input.reportKind, format: input.format ?? ReportExportFormat.CSV, year: input.year, month: input.month },
    });
    return this.mapExport(created);
  }

  async processReportExport(exportId: string): Promise<ReportExportDto> {
    const row = await this.exportRepository.findById(exportId);
    if (!row) throw new Error("REPORT_EXPORT_NOT_FOUND");
    if (row.status !== "PENDING" && row.status !== "FAILED") {
      return this.mapExport(row);
    }

    await this.exportRepository.markProcessing(exportId);

    try {
      const filter: ReportFilter = {
        organizationId: row.organizationId,
        propertyId: row.propertyId,
        year: row.year,
        month: row.month,
        blockId: row.blockId,
        actorUserId: row.requestedByUserId,
      };
      const format = row.format ?? ReportExportFormat.CSV;
      let rendered: { buffer: Buffer; contentType: string; extension: string };
      if (row.reportKind === "AUDIT_PACKAGE") {
        rendered = await buildAuditPackageZip(
          filter,
          (k, f, fmt) => this.exportReportFile(k, f, fmt),
          this.reportingCore,
        );
      } else {
        rendered = await this.exportReportFile(row.reportKind as StandardReportKind, filter, format);
      }
      const ext = extensionForFormat(format);
      const storageKey = `reports/${row.organizationId}/${exportId}.${ext}`;
      await this.files.save(storageKey, rendered.buffer);
      const saved = await this.exportRepository.markReady(exportId, storageKey);

      await this.notifications.enqueueReportExportReady({
        organizationId: row.organizationId,
        propertyId: row.propertyId,
        exportId,
        reportKind: row.reportKind,
        year: row.year,
        month: row.month,
        requestedByUserId: row.requestedByUserId,
        actorUserId: row.requestedByUserId,
      });
      await this.notifications.processPending({
        organizationId: row.organizationId,
        propertyId: row.propertyId,
        limit: 10,
      });

      return this.mapExport(saved);
    } catch (error) {
      const message = error instanceof Error ? error.message : "EXPORT_FAILED";
      const failed = await this.exportRepository.markFailed(exportId, message);
      return this.mapExport(failed);
    }
  }

  async processPendingExports(limit = 10): Promise<ProcessPendingExportsResult> {
    const capped = Math.min(Math.max(limit, 1), 50);
    const pending = await this.exportRepository.listPending(capped);
    let ready = 0;
    let failed = 0;

    for (const row of pending) {
      const result = await this.processReportExport(row.id);
      if (result.status === "READY") {
        ready += 1;
      } else if (result.status === "FAILED") {
        failed += 1;
      }
    }

    return { processed: pending.length, ready, failed };
  }

  async listReportExports(organizationId: string, propertyId: string, limit = 10): Promise<ReportExportDto[]> {
    const rows = await this.exportRepository.listRecent(organizationId, propertyId, limit);
    return rows.map((r) => this.mapExport(r));
  }

  async readExportFile(
    organizationId: string,
    exportId: string,
  ): Promise<{ data: Buffer; fileName: string; contentType: string }> {
    const row = await this.exportRepository.findById(exportId);
    if (!row || row.organizationId !== organizationId) throw new Error("REPORT_EXPORT_NOT_FOUND");
    if (row.status !== "READY" || !row.storageKey) throw new Error("REPORT_EXPORT_NOT_READY");
    const data = await this.files.read(row.storageKey);
    const format = row.format ?? ReportExportFormat.CSV;
    const ext = extensionForFormat(format);
    const fileName =
      row.reportKind === "AUDIT_PACKAGE"
        ? `audit_package_${row.year}.zip`
        : isAnnualReportKind(row.reportKind as StandardReportKind)
          ? `${row.reportKind.toLowerCase()}_${row.year}.${ext}`
          : `${row.reportKind.toLowerCase()}_${row.year}-${row.month}.${ext}`;
    return { data, fileName, contentType: contentTypeForFormat(format) };
  }
}

export function createStandardReportingService(): StandardReportingService {
  return new StandardReportingService();
}
