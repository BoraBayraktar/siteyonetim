import { ReportExportFormat, ReportExportStatus, prisma } from "@siteyonetim/db";

import type { StandardReportKind } from "./contract";

const notDeleted = { deleted: false };

export class ReportExportRepository {
  async create(input: {
    organizationId: string;
    propertyId: string;
    reportKind: StandardReportKind;
    format?: ReportExportFormat;
    year: number;
    month: number;
    blockId?: string | null;
    requestedByUserId?: string | null;
  }) {
    return prisma.reportExport.create({
      data: {
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        reportKind: input.reportKind,
        format: input.format ?? ReportExportFormat.CSV,
        year: input.year,
        month: input.month,
        blockId: input.blockId ?? null,
        requestedByUserId: input.requestedByUserId ?? null,
        status: ReportExportStatus.PENDING,
      },
    });
  }

  async findById(id: string) {
    return prisma.reportExport.findFirst({
      where: { id, ...notDeleted },
    });
  }

  async markProcessing(id: string) {
    return prisma.reportExport.update({
      where: { id },
      data: { status: ReportExportStatus.PROCESSING },
    });
  }

  async markReady(id: string, storageKey: string) {
    return prisma.reportExport.update({
      where: { id },
      data: {
        status: ReportExportStatus.READY,
        storageKey,
        completedAt: new Date(),
        errorMessage: null,
      },
    });
  }

  async markFailed(id: string, errorMessage: string) {
    return prisma.reportExport.update({
      where: { id },
      data: {
        status: ReportExportStatus.FAILED,
        errorMessage,
        completedAt: new Date(),
      },
    });
  }

  async listRecent(organizationId: string, propertyId: string, limit: number) {
    return prisma.reportExport.findMany({
      where: { organizationId, propertyId, ...notDeleted },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async listPending(limit: number) {
    return prisma.reportExport.findMany({
      where: { status: ReportExportStatus.PENDING, ...notDeleted },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }
}
