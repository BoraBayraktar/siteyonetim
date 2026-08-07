import {
  AssemblyAttendanceKind,
  AuditorReportStatus,
  OccupancyRole,
  prisma,
} from "@siteyonetim/db";

import type {
  AssemblyAttendanceDto,
  AssemblyDecisionDto,
  CreateMeetingInput,
  GeneralAssemblyMeetingDetailDto,
  GeneralAssemblyMeetingSummaryDto,
  GovernanceContext,
  ListMeetingsInput,
  UpdateMeetingInput,
  UpsertAttendanceInput,
} from "./contract";

const notDeleted = { deleted: false } as const;

type MeetingSummaryRow = {
  id: string;
  propertyId: string;
  meetingDate: Date;
  meetingType: GeneralAssemblyMeetingSummaryDto["meetingType"];
  title: string | null;
  linkedReportId: string | null;
  noticeSentAt: Date | null;
  noticeMethod: GeneralAssemblyMeetingSummaryDto["noticeMethod"];
  _count: { decisions: number; attendances: number };
};

type MeetingDetailRow = {
  id: string;
  propertyId: string;
  meetingDate: Date;
  meetingType: GeneralAssemblyMeetingDetailDto["meetingType"];
  title: string | null;
  linkedReportId: string | null;
  noticeSentAt: Date | null;
  noticeMethod: GeneralAssemblyMeetingDetailDto["noticeMethod"];
  notes: string | null;
  property: { name: string; organization: { name: string } };
  linkedReport: { year: number; period: string } | null;
  decisions: Array<{
    id: string;
    meetingId: string;
    topic: string;
    outcome: string;
    sortOrder: number;
  }>;
  attendances: Array<{
    id: string;
    meetingId: string;
    unitId: string;
    attendanceKind: AssemblyAttendanceKind;
    proxyHolderName: string | null;
    notes: string | null;
    unit: {
      code: string;
      block: { name: string } | null;
      occupancies: Array<{ party: { displayName: string } }>;
    };
  }>;
};

function mapSummary(row: MeetingSummaryRow): GeneralAssemblyMeetingSummaryDto {
  return {
    id: row.id,
    propertyId: row.propertyId,
    meetingDate: row.meetingDate.toISOString(),
    meetingType: row.meetingType,
    title: row.title,
    linkedReportId: row.linkedReportId,
    noticeSentAt: row.noticeSentAt?.toISOString() ?? null,
    noticeMethod: row.noticeMethod,
    decisionCount: row._count.decisions,
    attendanceCount: row._count.attendances,
  };
}

function mapAttendance(row: MeetingDetailRow["attendances"][number]): AssemblyAttendanceDto {
  return {
    id: row.id,
    meetingId: row.meetingId,
    unitId: row.unitId,
    unitCode: row.unit.code,
    blockName: row.unit.block?.name ?? null,
    partyName: row.unit.occupancies[0]?.party.displayName ?? null,
    attendanceKind: row.attendanceKind,
    proxyHolderName: row.proxyHolderName,
    notes: row.notes,
  };
}

function mapDetail(row: MeetingDetailRow): GeneralAssemblyMeetingDetailDto {
  const linkedReportLabel = row.linkedReport
    ? `${row.linkedReport.year} ${row.linkedReport.period}`
    : null;

  return {
    id: row.id,
    propertyId: row.propertyId,
    propertyName: row.property.name,
    organizationName: row.property.organization.name,
    meetingDate: row.meetingDate.toISOString(),
    meetingType: row.meetingType,
    title: row.title,
    linkedReportId: row.linkedReportId,
    linkedReportLabel,
    noticeSentAt: row.noticeSentAt?.toISOString() ?? null,
    noticeMethod: row.noticeMethod,
    notes: row.notes,
    decisions: row.decisions.map((d) => ({
      id: d.id,
      meetingId: d.meetingId,
      topic: d.topic,
      outcome: d.outcome,
      sortOrder: d.sortOrder,
    })),
    attendances: row.attendances.map(mapAttendance),
  };
}

const meetingInclude = {
  property: { select: { name: true, organization: { select: { name: true } } } },
  linkedReport: { select: { year: true, period: true } },
  decisions: {
    where: notDeleted,
    orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
  },
  attendances: {
    where: notDeleted,
    orderBy: [{ unit: { code: "asc" as const } }],
    include: {
      unit: {
        include: {
          block: { select: { name: true } },
          occupancies: {
            where: { ...notDeleted, endDate: null, role: OccupancyRole.OWNER },
            take: 1,
            select: { party: { select: { displayName: true } } },
          },
        },
      },
    },
  },
};

export class GovernanceRepository {
  async propertyExists(organizationId: string, propertyId: string) {
    const row = await prisma.property.findFirst({
      where: { id: propertyId, organizationId, ...notDeleted },
      select: { id: true },
    });
    return Boolean(row);
  }

  async getMeeting(ctx: GovernanceContext, meetingId: string) {
    const row = await prisma.generalAssemblyMeeting.findFirst({
      where: {
        id: meetingId,
        organizationId: ctx.organizationId,
        propertyId: ctx.propertyId,
        ...notDeleted,
      },
      include: meetingInclude,
    });
    return row ? mapDetail(row as MeetingDetailRow) : null;
  }

  async listMeetings(input: ListMeetingsInput) {
    const where = {
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      ...notDeleted,
    };
    const [rows, total] = await Promise.all([
      prisma.generalAssemblyMeeting.findMany({
        where,
        orderBy: [{ meetingDate: "desc" }],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        include: {
          _count: {
            select: {
              decisions: { where: notDeleted },
              attendances: { where: notDeleted },
            },
          },
        },
      }),
      prisma.generalAssemblyMeeting.count({ where }),
    ]);
    return {
      items: (rows as MeetingSummaryRow[]).map(mapSummary),
      total,
      page: input.page,
      pageSize: input.pageSize,
    };
  }

  async createMeeting(input: CreateMeetingInput) {
    const row = await prisma.generalAssemblyMeeting.create({
      data: {
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        meetingDate: new Date(input.meetingDate),
        meetingType: input.meetingType,
        title: input.title?.trim() || null,
        linkedReportId: input.linkedReportId || null,
        noticeSentAt: input.noticeSentAt ? new Date(input.noticeSentAt) : null,
        noticeMethod: input.noticeMethod ?? null,
        notes: input.notes?.trim() || null,
      },
      include: meetingInclude,
    });
    return mapDetail(row as MeetingDetailRow);
  }

  async updateMeeting(input: UpdateMeetingInput) {
    const updated = await prisma.generalAssemblyMeeting.updateMany({
      where: {
        id: input.meetingId,
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        ...notDeleted,
      },
      data: {
        meetingDate: new Date(input.meetingDate),
        meetingType: input.meetingType,
        title: input.title?.trim() || null,
        linkedReportId: input.linkedReportId || null,
        noticeSentAt: input.noticeSentAt ? new Date(input.noticeSentAt) : null,
        noticeMethod: input.noticeMethod ?? null,
        notes: input.notes?.trim() || null,
      },
    });
    if (updated.count === 0) throw new Error("MEETING_NOT_FOUND");

    const row = await prisma.generalAssemblyMeeting.findFirst({
      where: { id: input.meetingId, ...notDeleted },
      include: meetingInclude,
    });
    if (!row) throw new Error("MEETING_NOT_FOUND");
    return mapDetail(row as MeetingDetailRow);
  }

  async softDeleteMeeting(ctx: GovernanceContext, meetingId: string, actorUserId?: string | null) {
    await prisma.generalAssemblyMeeting.updateMany({
      where: {
        id: meetingId,
        organizationId: ctx.organizationId,
        propertyId: ctx.propertyId,
        ...notDeleted,
      },
      data: {
        deleted: true,
        deletedDate: new Date(),
        deletedUserId: actorUserId ?? null,
      },
    });
  }

  async meetingExists(ctx: GovernanceContext, meetingId: string) {
    const row = await prisma.generalAssemblyMeeting.findFirst({
      where: {
        id: meetingId,
        organizationId: ctx.organizationId,
        propertyId: ctx.propertyId,
        ...notDeleted,
      },
      select: { id: true },
    });
    return Boolean(row);
  }

  async approvedReportExists(organizationId: string, propertyId: string, reportId: string) {
    const row = await prisma.auditorReport.findFirst({
      where: {
        id: reportId,
        organizationId,
        propertyId,
        status: AuditorReportStatus.APPROVED,
        ...notDeleted,
      },
      select: { id: true },
    });
    return Boolean(row);
  }

  async addDecision(
    ctx: GovernanceContext,
    meetingId: string,
    topic: string,
    outcome: string,
    sortOrder: number,
  ): Promise<AssemblyDecisionDto> {
    const row = await prisma.assemblyDecision.create({
      data: {
        organizationId: ctx.organizationId,
        propertyId: ctx.propertyId,
        meetingId,
        topic,
        outcome,
        sortOrder,
      },
    });
    return {
      id: row.id,
      meetingId: row.meetingId,
      topic: row.topic,
      outcome: row.outcome,
      sortOrder: row.sortOrder,
    };
  }

  async updateDecision(
    ctx: GovernanceContext,
    meetingId: string,
    decisionId: string,
    topic: string,
    outcome: string,
  ): Promise<AssemblyDecisionDto | null> {
    const existing = await prisma.assemblyDecision.findFirst({
      where: {
        id: decisionId,
        meetingId,
        organizationId: ctx.organizationId,
        propertyId: ctx.propertyId,
        ...notDeleted,
      },
    });
    if (!existing) return null;

    const row = await prisma.assemblyDecision.update({
      where: { id: decisionId },
      data: { topic, outcome },
    });
    return {
      id: row.id,
      meetingId: row.meetingId,
      topic: row.topic,
      outcome: row.outcome,
      sortOrder: row.sortOrder,
    };
  }

  async softDeleteDecision(ctx: GovernanceContext, meetingId: string, decisionId: string, actorUserId?: string | null) {
    await prisma.assemblyDecision.updateMany({
      where: {
        id: decisionId,
        meetingId,
        organizationId: ctx.organizationId,
        propertyId: ctx.propertyId,
        ...notDeleted,
      },
      data: {
        deleted: true,
        deletedDate: new Date(),
        deletedUserId: actorUserId ?? null,
      },
    });
  }

  async nextDecisionSortOrder(meetingId: string) {
    const row = await prisma.assemblyDecision.findFirst({
      where: { meetingId, ...notDeleted },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    return (row?.sortOrder ?? 0) + 1;
  }

  async unitExists(ctx: GovernanceContext, unitId: string) {
    const row = await prisma.unit.findFirst({
      where: {
        id: unitId,
        propertyId: ctx.propertyId,
        property: { organizationId: ctx.organizationId, ...notDeleted },
        ...notDeleted,
      },
      select: { id: true },
    });
    return Boolean(row);
  }

  async upsertAttendance(input: UpsertAttendanceInput): Promise<AssemblyAttendanceDto | null> {
    const row = await prisma.assemblyAttendance.upsert({
      where: {
        meetingId_unitId: {
          meetingId: input.meetingId,
          unitId: input.unitId,
        },
      },
      create: {
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        meetingId: input.meetingId,
        unitId: input.unitId,
        attendanceKind: input.attendanceKind,
        proxyHolderName: input.proxyHolderName?.trim() || null,
        notes: input.notes?.trim() || null,
        deleted: false,
        deletedDate: null,
        deletedUserId: null,
      },
      update: {
        attendanceKind: input.attendanceKind,
        proxyHolderName: input.proxyHolderName?.trim() || null,
        notes: input.notes?.trim() || null,
        deleted: false,
        deletedDate: null,
        deletedUserId: null,
      },
      include: {
        unit: {
          include: {
            block: { select: { name: true } },
            occupancies: {
              where: { ...notDeleted, endDate: null, role: OccupancyRole.OWNER },
              take: 1,
              select: { party: { select: { displayName: true } } },
            },
          },
        },
      },
    });

    return {
      id: row.id,
      meetingId: row.meetingId,
      unitId: row.unitId,
      unitCode: row.unit.code,
      blockName: row.unit.block?.name ?? null,
      partyName: row.unit.occupancies[0]?.party.displayName ?? null,
      attendanceKind: row.attendanceKind,
      proxyHolderName: row.proxyHolderName,
      notes: row.notes,
    };
  }

  async softDeleteAttendance(
    ctx: GovernanceContext,
    meetingId: string,
    attendanceId: string,
    actorUserId?: string | null,
  ) {
    await prisma.assemblyAttendance.updateMany({
      where: {
        id: attendanceId,
        meetingId,
        organizationId: ctx.organizationId,
        propertyId: ctx.propertyId,
        ...notDeleted,
      },
      data: {
        deleted: true,
        deletedDate: new Date(),
        deletedUserId: actorUserId ?? null,
      },
    });
  }

  async listHazirunRows(ctx: GovernanceContext, meetingId: string) {
    const [meeting, units, attendances] = await Promise.all([
      prisma.generalAssemblyMeeting.findFirst({
        where: {
          id: meetingId,
          organizationId: ctx.organizationId,
          propertyId: ctx.propertyId,
          ...notDeleted,
        },
        include: {
          property: { select: { name: true, organization: { select: { name: true } } } },
        },
      }),
      prisma.unit.findMany({
        where: { propertyId: ctx.propertyId, ...notDeleted },
        orderBy: { code: "asc" },
        include: {
          block: { select: { name: true } },
          occupancies: {
            where: { ...notDeleted, endDate: null, role: OccupancyRole.OWNER },
            take: 1,
            select: { party: { select: { displayName: true } } },
          },
        },
      }),
      prisma.assemblyAttendance.findMany({
        where: { meetingId, ...notDeleted },
      }),
    ]);

    if (!meeting) return null;

    const attendanceByUnit = new Map(attendances.map((a) => [a.unitId, a]));

    return {
      meeting,
      rows: units.map((unit) => {
        const attendance = attendanceByUnit.get(unit.id);
        return {
          unitCode: unit.code,
          blockName: unit.block?.name ?? "",
          partyName: unit.occupancies[0]?.party.displayName ?? "",
          attendanceKind: attendance?.attendanceKind ?? AssemblyAttendanceKind.ABSENT,
          proxyHolderName: attendance?.proxyHolderName ?? "",
        };
      }),
    };
  }
}
