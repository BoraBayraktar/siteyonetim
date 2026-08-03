import {
  AuditorDischargeRecommendation,
  AuditorReportPeriod,
  AuditorReportStatus,
  OrganizationRole,
  prisma,
} from "@siteyonetim/db";

import type {
  AuditorAssignmentDto,
  AuditorReportDto,
  ListAuditorAssignmentsInput,
} from "./contract";

const notDeleted = { deleted: false };

type AssignmentRow = {
  id: string;
  organizationId: string;
  propertyId: string;
  year: number;
  period: AuditorReportPeriod;
  auditorUserId: string;
  assignedByUserId: string;
  assignedAt: Date;
  reports: { id: string; status: AuditorReportStatus }[];
};

async function loadAuditorUsers(organizationId: string, userIds: string[]) {
  if (userIds.length === 0) return new Map<string, { name: string; email: string }>();

  const memberships = await prisma.userOrganization.findMany({
    where: {
      organizationId,
      userId: { in: userIds },
      user: notDeleted,
    },
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  return new Map(
    memberships.map((row) => [
      row.userId,
      { name: row.user.name, email: row.user.email },
    ]),
  );
}

function toDto(row: AssignmentRow, auditor?: { name: string; email: string }): AuditorAssignmentDto {
  const latestReport = row.reports[0] ?? null;
  return {
    id: row.id,
    organizationId: row.organizationId,
    propertyId: row.propertyId,
    year: row.year,
    period: row.period,
    auditorUserId: row.auditorUserId,
    auditorName: auditor?.name ?? row.auditorUserId,
    auditorEmail: auditor?.email ?? "",
    assignedByUserId: row.assignedByUserId,
    assignedAt: row.assignedAt.toISOString(),
    reportStatus: latestReport?.status ?? null,
    reportId: latestReport?.id ?? null,
  };
}

function toReportDto(row: {
  id: string;
  organizationId: string;
  propertyId: string;
  assignmentId: string;
  year: number;
  period: AuditorReportPeriod;
  status: AuditorReportStatus;
  findingsHtml: string | null;
  opinionHtml: string | null;
  dischargeRecommendation: AuditorDischargeRecommendation | null;
  submittedAt: Date | null;
  approvedAt: Date | null;
  finalizedPdfKey: string | null;
}): AuditorReportDto {
  return {
    id: row.id,
    organizationId: row.organizationId,
    propertyId: row.propertyId,
    assignmentId: row.assignmentId,
    year: row.year,
    period: row.period,
    status: row.status,
    findingsHtml: row.findingsHtml,
    opinionHtml: row.opinionHtml,
    dischargeRecommendation: row.dischargeRecommendation,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    finalizedPdfKey: row.finalizedPdfKey,
  };
}

export class AuditorReportRepository {
  async propertyBelongsToOrg(organizationId: string, propertyId: string): Promise<boolean> {
    const row = await prisma.property.findFirst({
      where: { id: propertyId, organizationId, ...notDeleted },
      select: { id: true },
    });
    return Boolean(row);
  }

  async findAuditorMembership(organizationId: string, auditorUserId: string) {
    return prisma.userOrganization.findFirst({
      where: {
        organizationId,
        userId: auditorUserId,
        role: OrganizationRole.AUDITOR,
        user: notDeleted,
      },
    });
  }

  async auditorHasPropertyAccess(
    organizationId: string,
    propertyId: string,
    auditorUserId: string,
  ): Promise<boolean> {
    const row = await prisma.userPropertyAccess.findFirst({
      where: {
        organizationId,
        propertyId,
        userId: auditorUserId,
        role: "PROPERTY_AUDITOR",
        ...notDeleted,
        property: notDeleted,
      },
    });
    return Boolean(row);
  }

  async findActiveAssignment(input: {
    propertyId: string;
    year: number;
    period: AuditorReportPeriod;
    auditorUserId: string;
  }) {
    return prisma.auditorAssignment.findFirst({
      where: {
        propertyId: input.propertyId,
        year: input.year,
        period: input.period,
        auditorUserId: input.auditorUserId,
        ...notDeleted,
      },
    });
  }

  async createAssignment(input: {
    organizationId: string;
    propertyId: string;
    year: number;
    period: AuditorReportPeriod;
    auditorUserId: string;
    assignedByUserId: string;
  }) {
    return prisma.auditorAssignment.create({
      data: {
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        year: input.year,
        period: input.period,
        auditorUserId: input.auditorUserId,
        assignedByUserId: input.assignedByUserId,
      },
    });
  }

  async listAssignments(input: ListAuditorAssignmentsInput) {
    const where = {
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      ...notDeleted,
      ...(input.year != null ? { year: input.year } : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.auditorAssignment.findMany({
        where,
        include: {
          reports: {
            where: notDeleted,
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true, status: true },
          },
        },
        orderBy: [{ year: "desc" }, { assignedAt: "desc" }],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
      prisma.auditorAssignment.count({ where }),
    ]);

    const auditorIds = [...new Set(rows.map((row) => row.auditorUserId))];
    const auditors = await loadAuditorUsers(input.organizationId, auditorIds);

    return {
      rows: rows.map((row) => toDto(row as AssignmentRow, auditors.get(row.auditorUserId))),
      total,
    };
  }

  async findAssignmentById(organizationId: string, propertyId: string, assignmentId: string) {
    const row = await prisma.auditorAssignment.findFirst({
      where: {
        id: assignmentId,
        organizationId,
        propertyId,
        ...notDeleted,
      },
      include: {
        reports: {
          where: notDeleted,
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, status: true },
        },
      },
    });
    if (!row) return null;

    const auditors = await loadAuditorUsers(organizationId, [row.auditorUserId]);
    return toDto(row as AssignmentRow, auditors.get(row.auditorUserId));
  }

  async findAssignmentForAuditor(input: {
    organizationId: string;
    propertyId: string;
    auditorUserId: string;
    year: number;
    period: AuditorReportPeriod;
  }) {
    const row = await prisma.auditorAssignment.findFirst({
      where: {
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        auditorUserId: input.auditorUserId,
        year: input.year,
        period: input.period,
        ...notDeleted,
      },
      include: {
        reports: {
          where: notDeleted,
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, status: true },
        },
      },
    });
    if (!row) return null;

    const auditors = await loadAuditorUsers(input.organizationId, [row.auditorUserId]);
    return toDto(row as AssignmentRow, auditors.get(row.auditorUserId));
  }

  async hasApprovedReport(assignmentId: string): Promise<boolean> {
    const row = await prisma.auditorReport.findFirst({
      where: {
        assignmentId,
        status: AuditorReportStatus.APPROVED,
        ...notDeleted,
      },
      select: { id: true },
    });
    return Boolean(row);
  }

  async softDeleteAssignment(assignmentId: string, actorUserId: string) {
    await prisma.auditorAssignment.update({
      where: { id: assignmentId },
      data: {
        deleted: true,
        deletedDate: new Date(),
        deletedUserId: actorUserId,
      },
    });
  }

  async findAssignmentOwnedByAuditor(
    organizationId: string,
    propertyId: string,
    assignmentId: string,
    auditorUserId: string,
  ) {
    return prisma.auditorAssignment.findFirst({
      where: {
        id: assignmentId,
        organizationId,
        propertyId,
        auditorUserId,
        ...notDeleted,
      },
    });
  }

  async findReportByAssignment(assignmentId: string) {
    const row = await prisma.auditorReport.findFirst({
      where: { assignmentId, ...notDeleted },
      orderBy: { createdAt: "desc" },
    });
    return row ? toReportDto(row) : null;
  }

  async findReportById(organizationId: string, propertyId: string, reportId: string) {
    const row = await prisma.auditorReport.findFirst({
      where: {
        id: reportId,
        organizationId,
        propertyId,
        ...notDeleted,
      },
      include: {
        assignment: { select: { auditorUserId: true, deleted: true } },
      },
    });
    if (!row || row.assignment.deleted) return null;
    return { report: toReportDto(row), auditorUserId: row.assignment.auditorUserId };
  }

  async createReport(input: {
    organizationId: string;
    propertyId: string;
    assignmentId: string;
    year: number;
    period: AuditorReportPeriod;
  }) {
    const row = await prisma.auditorReport.create({
      data: {
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        assignmentId: input.assignmentId,
        year: input.year,
        period: input.period,
        status: AuditorReportStatus.DRAFT,
      },
    });
    return toReportDto(row);
  }

  async updateReportDraft(
    reportId: string,
    input: {
      findingsHtml: string | null;
      opinionHtml: string | null;
      dischargeRecommendation: AuditorDischargeRecommendation | null;
    },
  ) {
    const row = await prisma.auditorReport.update({
      where: { id: reportId },
      data: {
        findingsHtml: input.findingsHtml,
        opinionHtml: input.opinionHtml,
        dischargeRecommendation: input.dischargeRecommendation,
      },
    });
    return toReportDto(row);
  }

  async updateReportStatus(
    reportId: string,
    input: {
      status: AuditorReportStatus;
      submittedAt?: Date | null;
      approvedAt?: Date | null;
      approvedByUserId?: string | null;
      finalizedPdfKey?: string | null;
    },
  ) {
    const row = await prisma.auditorReport.update({
      where: { id: reportId },
      data: input,
    });
    return toReportDto(row);
  }

  async listApprovedReports(organizationId: string, propertyId: string, year?: number) {
    const rows = await prisma.auditorReport.findMany({
      where: {
        organizationId,
        propertyId,
        status: AuditorReportStatus.APPROVED,
        ...notDeleted,
        ...(year !== undefined ? { year } : {}),
      },
      orderBy: [{ year: "desc" }, { approvedAt: "desc" }],
      select: {
        id: true,
        year: true,
        period: true,
        approvedAt: true,
      },
    });
    return rows.map((row) => ({
      id: row.id,
      year: row.year,
      period: row.period,
      approvedAt: row.approvedAt?.toISOString() ?? null,
    }));
  }
}
