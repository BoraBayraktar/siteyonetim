import {
  AssemblyAttendanceMode,
  AuditorReportStatus,
  Prisma,
  prisma,
} from "@siteyonetim/db";

import type { GovernanceContext, ListMeetingsInput } from "./contract";

const notDeleted = { deleted: false };

function yearRange(year: number) {
  return {
    from: new Date(year, 0, 1),
    to: new Date(year, 11, 31, 23, 59, 59, 999),
  };
}

function linkedReportLabel(report: {
  year: number;
  period: string;
  approvedAt: Date | null;
} | null): string | null {
  if (!report) return null;
  const approved = report.approvedAt?.toISOString().slice(0, 10) ?? "";
  return `${report.year} ${report.period}${approved ? ` (${approved})` : ""}`;
}

export class GovernanceRepository {
  async assertProperty(organizationId: string, propertyId: string) {
    const row = await prisma.property.findFirst({
      where: { id: propertyId, organizationId, deleted: false },
      select: {
        id: true,
        name: true,
        address: true,
        organization: { select: { name: true } },
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      address: row.address,
      organizationName: row.organization.name,
    };
  }

  async listUnitIds(propertyId: string) {
    return prisma.unit.findMany({
      where: { propertyId, deleted: false },
      select: { id: true },
      orderBy: { code: "asc" },
    });
  }

  async validateApprovedReport(organizationId: string, propertyId: string, reportId: string) {
    return prisma.auditorReport.findFirst({
      where: {
        id: reportId,
        organizationId,
        propertyId,
        status: AuditorReportStatus.APPROVED,
        ...notDeleted,
      },
      select: { id: true },
    });
  }

  async isReportLinkedElsewhere(reportId: string, excludeMeetingId?: string) {
    const row = await prisma.generalAssemblyMeeting.findFirst({
      where: {
        linkedReportId: reportId,
        ...notDeleted,
        ...(excludeMeetingId ? { id: { not: excludeMeetingId } } : {}),
      },
      select: { id: true },
    });
    return Boolean(row);
  }

  async createMeeting(
    input: {
      organizationId: string;
      propertyId: string;
      meetingType: import("@siteyonetim/db").GeneralAssemblyMeetingType;
      meetingDate: Date;
      location: string | null;
      agendaSummary: string | null;
      noticeSentAt: Date | null;
      noticeMethod: string | null;
      linkedReportId: string | null;
    },
    unitIds: string[],
  ) {
    return prisma.$transaction(async (tx) => {
      const meeting = await tx.generalAssemblyMeeting.create({
        data: input,
        include: {
          linkedReport: {
            select: { year: true, period: true, approvedAt: true },
          },
        },
      });

      if (unitIds.length > 0) {
        await tx.assemblyAttendance.createMany({
          data: unitIds.map((unitId) => ({
            meetingId: meeting.id,
            unitId,
            mode: AssemblyAttendanceMode.ABSENT,
          })),
        });
      }

      return meeting;
    });
  }

  async listMeetings(input: ListMeetingsInput) {
    const page = Math.max(1, input.page);
    const pageSize = Math.min(Math.max(input.pageSize, 1), 100);
    const dateFilter = input.year ? yearRange(input.year) : null;

    const where = {
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      ...notDeleted,
      ...(dateFilter
        ? { meetingDate: { gte: dateFilter.from, lte: dateFilter.to } }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.generalAssemblyMeeting.findMany({
        where,
        include: {
          linkedReport: { select: { year: true, period: true, approvedAt: true } },
          _count: {
            select: {
              decisions: { where: notDeleted },
              attendances: { where: notDeleted },
            },
          },
          attendances: {
            where: {
              ...notDeleted,
              mode: { in: [AssemblyAttendanceMode.IN_PERSON, AssemblyAttendanceMode.PROXY] },
            },
            select: { id: true },
          },
        },
        orderBy: [{ meetingDate: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.generalAssemblyMeeting.count({ where }),
    ]);

    return {
      rows: rows.map((row) => ({
        id: row.id,
        meetingType: row.meetingType,
        meetingDate: row.meetingDate,
        location: row.location,
        agendaSummary: row.agendaSummary,
        noticeSentAt: row.noticeSentAt,
        noticeMethod: row.noticeMethod,
        linkedReportId: row.linkedReportId,
        linkedReportLabel: linkedReportLabel(row.linkedReport),
        decisionCount: row._count.decisions,
        attendanceCount: row._count.attendances,
        presentCount: row.attendances.length,
      })),
      total,
      page,
      pageSize,
    };
  }

  async getMeetingDetail(organizationId: string, propertyId: string, meetingId: string) {
    const row = await prisma.generalAssemblyMeeting.findFirst({
      where: {
        id: meetingId,
        organizationId,
        propertyId,
        ...notDeleted,
      },
      include: {
        linkedReport: { select: { year: true, period: true, approvedAt: true } },
        decisions: {
          where: notDeleted,
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
        attendances: {
          where: notDeleted,
          include: {
            unit: {
              select: {
                id: true,
                code: true,
                block: { select: { name: true } },
              },
            },
          },
          orderBy: { unit: { code: "asc" } },
        },
        _count: {
          select: {
            decisions: { where: notDeleted },
            attendances: { where: notDeleted },
          },
        },
      },
    });

    if (!row) return null;

    const presentCount = row.attendances.filter(
      (a) => a.mode === AssemblyAttendanceMode.IN_PERSON || a.mode === AssemblyAttendanceMode.PROXY,
    ).length;

    return {
      id: row.id,
      meetingType: row.meetingType,
      meetingDate: row.meetingDate,
      location: row.location,
      agendaSummary: row.agendaSummary,
      noticeSentAt: row.noticeSentAt,
      noticeMethod: row.noticeMethod,
      linkedReportId: row.linkedReportId,
      linkedReportLabel: linkedReportLabel(row.linkedReport),
      decisionCount: row._count.decisions,
      attendanceCount: row._count.attendances,
      presentCount,
      decisions: row.decisions.map((d) => ({
        id: d.id,
        subject: d.subject,
        outcome: d.outcome,
        voteFor: d.voteFor,
        voteAgainst: d.voteAgainst,
        voteAbstain: d.voteAbstain,
        sortOrder: d.sortOrder,
      })),
      attendances: row.attendances.map((a) => ({
        id: a.id,
        unitId: a.unitId,
        unitCode: a.unit.code,
        blockName: a.unit.block?.name ?? null,
        ownerName: null as string | null,
        mode: a.mode,
        proxyHolder: a.proxyHolder,
        notes: a.notes,
      })),
    };
  }

  async updateMeeting(
    meetingId: string,
    data: Prisma.GeneralAssemblyMeetingUpdateInput,
  ) {
    return prisma.generalAssemblyMeeting.update({
      where: { id: meetingId },
      data,
      include: {
        linkedReport: { select: { year: true, period: true, approvedAt: true } },
      },
    });
  }

  async softDeleteMeeting(meetingId: string, actorUserId: string | null | undefined) {
    const now = new Date();
    await prisma.$transaction([
      prisma.generalAssemblyMeeting.update({
        where: { id: meetingId },
        data: { deleted: true, deletedDate: now, deletedUserId: actorUserId ?? null },
      }),
      prisma.assemblyDecision.updateMany({
        where: { meetingId, deleted: false },
        data: { deleted: true, deletedDate: now, deletedUserId: actorUserId ?? null },
      }),
      prisma.assemblyAttendance.updateMany({
        where: { meetingId, deleted: false },
        data: { deleted: true, deletedDate: now, deletedUserId: actorUserId ?? null },
      }),
    ]);
  }

  async upsertDecision(
    meetingId: string,
    data: {
      decisionId?: string | null;
      subject: string;
      outcome: import("@siteyonetim/db").AssemblyDecisionOutcome;
      voteFor: number | null;
      voteAgainst: number | null;
      voteAbstain: number | null;
      sortOrder: number;
    },
  ) {
    if (data.decisionId) {
      return prisma.assemblyDecision.update({
        where: { id: data.decisionId },
        data: {
          subject: data.subject,
          outcome: data.outcome,
          voteFor: data.voteFor,
          voteAgainst: data.voteAgainst,
          voteAbstain: data.voteAbstain,
          sortOrder: data.sortOrder,
        },
      });
    }

    return prisma.assemblyDecision.create({
      data: {
        meetingId,
        subject: data.subject,
        outcome: data.outcome,
        voteFor: data.voteFor,
        voteAgainst: data.voteAgainst,
        voteAbstain: data.voteAbstain,
        sortOrder: data.sortOrder,
      },
    });
  }

  async softDeleteDecision(decisionId: string, actorUserId: string | null | undefined) {
    await prisma.assemblyDecision.update({
      where: { id: decisionId },
      data: {
        deleted: true,
        deletedDate: new Date(),
        deletedUserId: actorUserId ?? null,
      },
    });
  }

  async findDecision(meetingId: string, decisionId: string) {
    return prisma.assemblyDecision.findFirst({
      where: { id: decisionId, meetingId, deleted: false },
    });
  }

  async upsertAttendance(
    meetingId: string,
    unitId: string,
    data: {
      mode: AssemblyAttendanceMode;
      proxyHolder: string | null;
      notes: string | null;
    },
  ) {
    return prisma.assemblyAttendance.upsert({
      where: { meetingId_unitId: { meetingId, unitId } },
      create: {
        meetingId,
        unitId,
        mode: data.mode,
        proxyHolder: data.proxyHolder,
        notes: data.notes,
      },
      update: {
        mode: data.mode,
        proxyHolder: data.proxyHolder,
        notes: data.notes,
        deleted: false,
        deletedDate: null,
        deletedUserId: null,
      },
      include: {
        unit: {
          select: {
            id: true,
            code: true,
            block: { select: { name: true } },
          },
        },
      },
    });
  }

  async assertMeeting(ctx: GovernanceContext, meetingId: string) {
    return prisma.generalAssemblyMeeting.findFirst({
      where: {
        id: meetingId,
        organizationId: ctx.organizationId,
        propertyId: ctx.propertyId,
        deleted: false,
      },
      select: { id: true },
    });
  }

  async assertUnit(propertyId: string, unitId: string) {
    return prisma.unit.findFirst({
      where: { id: unitId, propertyId, deleted: false },
      select: { id: true },
    });
  }
}
