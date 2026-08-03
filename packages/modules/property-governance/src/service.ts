import { AssemblyAttendanceMode, AssemblyDecisionOutcome, ReportExportFormat } from "@siteyonetim/db";
import { createAuditService } from "@siteyonetim/platform-audit";
import { createOccupancyService } from "@siteyonetim/property-occupancy";
import { createAuditorReportService } from "@siteyonetim/reporting-auditor";
import { createReportingCoreService } from "@siteyonetim/reporting-core";

import type {
  CreateMeetingInput,
  DeleteDecisionInput,
  DeleteMeetingInput,
  ExportHazirunInput,
  GeneralAssemblyMeetingDetailDto,
  GovernanceContext,
  GovernanceServiceContract,
  ListMeetingsInput,
  UpdateMeetingInput,
  UpsertAttendanceInput,
  UpsertDecisionInput,
} from "./contract";
import { buildHazirunDocument } from "./hazirun-export";
import { GovernanceRepository } from "./repository";

function parseOptionalDate(value: Date | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return value;
}

export class GovernanceService implements GovernanceServiceContract {
  constructor(
    private readonly repository = new GovernanceRepository(),
    private readonly audit = createAuditService(),
  ) {}

  private async assertContext(ctx: GovernanceContext) {
    const property = await this.repository.assertProperty(ctx.organizationId, ctx.propertyId);
    if (!property) throw new Error("PROPERTY_NOT_FOUND");
    return property;
  }

  private async resolveLinkedReportId(
    ctx: GovernanceContext,
    linkedReportId: string | null | undefined,
    excludeMeetingId?: string,
  ) {
    if (linkedReportId === undefined) return undefined;
    if (linkedReportId === null || linkedReportId === "") return null;

    const report = await this.repository.validateApprovedReport(
      ctx.organizationId,
      ctx.propertyId,
      linkedReportId,
    );
    if (!report) throw new Error("LINKED_REPORT_INVALID");

    const taken = await this.repository.isReportLinkedElsewhere(linkedReportId, excludeMeetingId);
    if (taken) throw new Error("LINKED_REPORT_ALREADY_USED");

    return linkedReportId;
  }

  private async enrichOwnerNames(
    ctx: GovernanceContext,
    detail: GeneralAssemblyMeetingDetailDto,
  ): Promise<GeneralAssemblyMeetingDetailDto> {
    const board = await createOccupancyService().listUnitBoard({
      organizationId: ctx.organizationId,
      propertyId: ctx.propertyId,
      page: 1,
      pageSize: 500,
    });
    const ownerByUnit = new Map(board.items.map((row) => [row.unitId, row.owner?.partyName ?? null]));

    return {
      ...detail,
      attendances: detail.attendances.map((row) => ({
        ...row,
        ownerName: ownerByUnit.get(row.unitId) ?? null,
      })),
    };
  }

  async listMeetings(input: ListMeetingsInput) {
    await this.assertContext(input);
    const result = await this.repository.listMeetings(input);
    return {
      items: result.rows,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  async getMeeting(ctx: GovernanceContext, meetingId: string) {
    await this.assertContext(ctx);
    const detail = await this.repository.getMeetingDetail(
      ctx.organizationId,
      ctx.propertyId,
      meetingId,
    );
    if (!detail) return null;
    return this.enrichOwnerNames(ctx, detail);
  }

  async createMeeting(input: CreateMeetingInput) {
    const property = await this.assertContext(input);
    const linkedReportId = await this.resolveLinkedReportId(input, input.linkedReportId ?? null);
    const units = await this.repository.listUnitIds(input.propertyId);

    const meeting = await this.repository.createMeeting(
      {
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        meetingType: input.meetingType,
        meetingDate: input.meetingDate,
        location: input.location?.trim() || null,
        agendaSummary: input.agendaSummary?.trim() || null,
        noticeSentAt: input.noticeSentAt ?? null,
        noticeMethod: input.noticeMethod?.trim() || null,
        linkedReportId: linkedReportId ?? null,
      },
      units.map((u) => u.id),
    );

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "governance.meeting.create",
      entityType: "GeneralAssemblyMeeting",
      entityId: meeting.id,
      metadata: { meetingType: input.meetingType },
    });

    const detail = await this.getMeeting(input, meeting.id);
    if (!detail) throw new Error("MEETING_NOT_FOUND");
    return detail;
  }

  async updateMeeting(input: UpdateMeetingInput) {
    await this.assertContext(input);
    const existing = await this.repository.assertMeeting(input, input.meetingId);
    if (!existing) throw new Error("MEETING_NOT_FOUND");

    const linkedReportId = await this.resolveLinkedReportId(
      input,
      input.linkedReportId,
      input.meetingId,
    );

    await this.repository.updateMeeting(input.meetingId, {
      ...(input.meetingType !== undefined ? { meetingType: input.meetingType } : {}),
      ...(input.meetingDate !== undefined ? { meetingDate: input.meetingDate } : {}),
      ...(input.location !== undefined ? { location: input.location?.trim() || null } : {}),
      ...(input.agendaSummary !== undefined ? { agendaSummary: input.agendaSummary?.trim() || null } : {}),
      ...(input.noticeSentAt !== undefined ? { noticeSentAt: parseOptionalDate(input.noticeSentAt) } : {}),
      ...(input.noticeMethod !== undefined ? { noticeMethod: input.noticeMethod?.trim() || null } : {}),
      ...(linkedReportId !== undefined ? { linkedReportId } : {}),
    });

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "governance.meeting.update",
      entityType: "GeneralAssemblyMeeting",
      entityId: input.meetingId,
    });

    const detail = await this.getMeeting(input, input.meetingId);
    if (!detail) throw new Error("MEETING_NOT_FOUND");
    return detail;
  }

  async deleteMeeting(input: DeleteMeetingInput) {
    await this.assertContext(input);
    const existing = await this.repository.assertMeeting(input, input.meetingId);
    if (!existing) throw new Error("MEETING_NOT_FOUND");

    await this.repository.softDeleteMeeting(input.meetingId, input.actorUserId);
    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "governance.meeting.delete",
      entityType: "GeneralAssemblyMeeting",
      entityId: input.meetingId,
    });
  }

  async upsertDecision(input: UpsertDecisionInput) {
    await this.assertContext(input);
    const meeting = await this.repository.assertMeeting(input, input.meetingId);
    if (!meeting) throw new Error("MEETING_NOT_FOUND");

    const subject = input.subject.trim();
    if (!subject) throw new Error("DECISION_SUBJECT_REQUIRED");

    if (input.decisionId) {
      const existing = await this.repository.findDecision(input.meetingId, input.decisionId);
      if (!existing) throw new Error("DECISION_NOT_FOUND");
    }

    const row = await this.repository.upsertDecision(input.meetingId, {
      decisionId: input.decisionId,
      subject,
      outcome: input.outcome ?? AssemblyDecisionOutcome.NOT_VOTED,
      voteFor: input.voteFor ?? null,
      voteAgainst: input.voteAgainst ?? null,
      voteAbstain: input.voteAbstain ?? null,
      sortOrder: input.sortOrder ?? 0,
    });

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "governance.decision.upsert",
      entityType: "AssemblyDecision",
      entityId: row.id,
      metadata: { meetingId: input.meetingId },
    });

    return {
      id: row.id,
      subject: row.subject,
      outcome: row.outcome,
      voteFor: row.voteFor,
      voteAgainst: row.voteAgainst,
      voteAbstain: row.voteAbstain,
      sortOrder: row.sortOrder,
    };
  }

  async deleteDecision(input: DeleteDecisionInput) {
    await this.assertContext(input);
    const meeting = await this.repository.assertMeeting(input, input.meetingId);
    if (!meeting) throw new Error("MEETING_NOT_FOUND");

    const decision = await this.repository.findDecision(input.meetingId, input.decisionId);
    if (!decision) throw new Error("DECISION_NOT_FOUND");

    await this.repository.softDeleteDecision(input.decisionId, input.actorUserId);
    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "governance.decision.delete",
      entityType: "AssemblyDecision",
      entityId: input.decisionId,
    });
  }

  async upsertAttendance(input: UpsertAttendanceInput) {
    await this.assertContext(input);
    const meeting = await this.repository.assertMeeting(input, input.meetingId);
    if (!meeting) throw new Error("MEETING_NOT_FOUND");

    const unit = await this.repository.assertUnit(input.propertyId, input.unitId);
    if (!unit) throw new Error("UNIT_NOT_FOUND");

    if (input.mode === AssemblyAttendanceMode.PROXY && !input.proxyHolder?.trim()) {
      throw new Error("PROXY_HOLDER_REQUIRED");
    }

    const row = await this.repository.upsertAttendance(input.meetingId, input.unitId, {
      mode: input.mode,
      proxyHolder: input.proxyHolder?.trim() || null,
      notes: input.notes?.trim() || null,
    });

    const detail = await this.getMeeting(input, input.meetingId);
    const ownerName =
      detail?.attendances.find((a) => a.unitId === input.unitId)?.ownerName ?? null;

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "governance.attendance.upsert",
      entityType: "AssemblyAttendance",
      entityId: row.id,
      metadata: { meetingId: input.meetingId, unitId: input.unitId, mode: input.mode },
    });

    return {
      id: row.id,
      unitId: row.unitId,
      unitCode: row.unit.code,
      blockName: row.unit.block?.name ?? null,
      ownerName,
      mode: row.mode,
      proxyHolder: row.proxyHolder,
      notes: row.notes,
    };
  }

  async listApprovedReportOptions(ctx: GovernanceContext, year?: number) {
    await this.assertContext(ctx);
    return createAuditorReportService().listApprovedReports({
      organizationId: ctx.organizationId,
      propertyId: ctx.propertyId,
      year,
    });
  }

  async exportHazirunPdf(input: ExportHazirunInput) {
    const property = await this.assertContext(input);
    const detail = await this.getMeeting(input, input.meetingId);
    if (!detail) throw new Error("MEETING_NOT_FOUND");

    const document = buildHazirunDocument(
      detail,
      input.propertyName ?? property.name,
      input.locale,
      property.organizationName,
    );
    const rendered = await createReportingCoreService().render(ReportExportFormat.PDF, document);

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "governance.hazirun.export",
      entityType: "GeneralAssemblyMeeting",
      entityId: input.meetingId,
      metadata: { format: "PDF" },
    });

    return rendered;
  }
}

export function createGovernanceService() {
  return new GovernanceService();
}
