import { createAuditService } from "@siteyonetim/platform-audit";

import type {
  AddDecisionInput,
  CreateMeetingInput,
  DeleteAttendanceInput,
  DeleteDecisionInput,
  DeleteMeetingInput,
  GovernanceContext,
  GovernanceServiceContract,
  HazirunExportInput,
  ListMeetingsInput,
  UpdateDecisionInput,
  UpdateMeetingInput,
  UpsertAttendanceInput,
} from "./contract";
import { buildHazirunDocument, renderHazirunPdf } from "./hazirun-export";
import { GovernanceRepository } from "./repository";

export class GovernanceService implements GovernanceServiceContract {
  constructor(
    private readonly repository = new GovernanceRepository(),
    private readonly audit = createAuditService(),
  ) {}

  private ctx(input: GovernanceContext): GovernanceContext {
    return {
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      actorUserId: input.actorUserId,
    };
  }

  private async assertProperty(ctx: GovernanceContext) {
    const ok = await this.repository.propertyExists(ctx.organizationId, ctx.propertyId);
    if (!ok) throw new Error("PROPERTY_NOT_FOUND");
  }

  private async assertMeeting(ctx: GovernanceContext, meetingId: string) {
    const ok = await this.repository.meetingExists(ctx, meetingId);
    if (!ok) throw new Error("MEETING_NOT_FOUND");
  }

  private async assertLinkedReport(ctx: GovernanceContext, linkedReportId: string | null | undefined) {
    if (!linkedReportId) return;
    const ok = await this.repository.approvedReportExists(
      ctx.organizationId,
      ctx.propertyId,
      linkedReportId,
    );
    if (!ok) throw new Error("LINKED_REPORT_INVALID");
  }

  async listMeetings(input: ListMeetingsInput) {
    await this.assertProperty(this.ctx(input));
    return this.repository.listMeetings(input);
  }

  async getMeeting(ctx: GovernanceContext, meetingId: string) {
    await this.assertProperty(this.ctx(ctx));
    return this.repository.getMeeting(this.ctx(ctx), meetingId);
  }

  async createMeeting(input: CreateMeetingInput) {
    const ctx = this.ctx(input);
    await this.assertProperty(ctx);
    if (!input.meetingDate.trim()) throw new Error("MEETING_DATE_REQUIRED");
    await this.assertLinkedReport(ctx, input.linkedReportId);

    const saved = await this.repository.createMeeting(input);
    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "governance.meeting.create",
      entityType: "GeneralAssemblyMeeting",
      entityId: saved.id,
    });
    return saved;
  }

  async updateMeeting(input: UpdateMeetingInput) {
    const ctx = this.ctx(input);
    await this.assertProperty(ctx);
    await this.assertMeeting(ctx, input.meetingId);
    if (!input.meetingDate.trim()) throw new Error("MEETING_DATE_REQUIRED");
    await this.assertLinkedReport(ctx, input.linkedReportId);

    const saved = await this.repository.updateMeeting(input);
    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "governance.meeting.update",
      entityType: "GeneralAssemblyMeeting",
      entityId: input.meetingId,
    });
    return saved;
  }

  async deleteMeeting(input: DeleteMeetingInput) {
    const ctx = this.ctx(input);
    await this.assertProperty(ctx);
    await this.assertMeeting(ctx, input.meetingId);
    await this.repository.softDeleteMeeting(ctx, input.meetingId, input.actorUserId);
    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "governance.meeting.delete",
      entityType: "GeneralAssemblyMeeting",
      entityId: input.meetingId,
    });
  }

  async addDecision(input: AddDecisionInput) {
    const ctx = this.ctx(input);
    await this.assertProperty(ctx);
    await this.assertMeeting(ctx, input.meetingId);
    if (!input.topic.trim()) throw new Error("DECISION_TOPIC_REQUIRED");
    if (!input.outcome.trim()) throw new Error("DECISION_OUTCOME_REQUIRED");

    const sortOrder = await this.repository.nextDecisionSortOrder(input.meetingId);
    const saved = await this.repository.addDecision(
      ctx,
      input.meetingId,
      input.topic.trim(),
      input.outcome.trim(),
      sortOrder,
    );
    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "governance.decision.create",
      entityType: "AssemblyDecision",
      entityId: saved.id,
    });
    return saved;
  }

  async updateDecision(input: UpdateDecisionInput) {
    const ctx = this.ctx(input);
    await this.assertProperty(ctx);
    await this.assertMeeting(ctx, input.meetingId);
    if (!input.topic.trim()) throw new Error("DECISION_TOPIC_REQUIRED");
    if (!input.outcome.trim()) throw new Error("DECISION_OUTCOME_REQUIRED");

    const saved = await this.repository.updateDecision(
      ctx,
      input.meetingId,
      input.decisionId,
      input.topic.trim(),
      input.outcome.trim(),
    );
    if (!saved) throw new Error("DECISION_NOT_FOUND");

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "governance.decision.update",
      entityType: "AssemblyDecision",
      entityId: input.decisionId,
    });
    return saved;
  }

  async deleteDecision(input: DeleteDecisionInput) {
    const ctx = this.ctx(input);
    await this.assertProperty(ctx);
    await this.assertMeeting(ctx, input.meetingId);
    await this.repository.softDeleteDecision(ctx, input.meetingId, input.decisionId, input.actorUserId);
    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "governance.decision.delete",
      entityType: "AssemblyDecision",
      entityId: input.decisionId,
    });
  }

  async upsertAttendance(input: UpsertAttendanceInput) {
    const ctx = this.ctx(input);
    await this.assertProperty(ctx);
    await this.assertMeeting(ctx, input.meetingId);
    const unitOk = await this.repository.unitExists(ctx, input.unitId);
    if (!unitOk) throw new Error("UNIT_NOT_FOUND");

    const saved = await this.repository.upsertAttendance(input);
    if (!saved) throw new Error("ATTENDANCE_SAVE_FAILED");

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "governance.attendance.upsert",
      entityType: "AssemblyAttendance",
      entityId: saved.id,
    });
    return saved;
  }

  async deleteAttendance(input: DeleteAttendanceInput) {
    const ctx = this.ctx(input);
    await this.assertProperty(ctx);
    await this.assertMeeting(ctx, input.meetingId);
    await this.repository.softDeleteAttendance(
      ctx,
      input.meetingId,
      input.attendanceId,
      input.actorUserId,
    );
    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "governance.attendance.delete",
      entityType: "AssemblyAttendance",
      entityId: input.attendanceId,
    });
  }

  async exportHazirunPdf(input: HazirunExportInput) {
    const ctx = this.ctx(input);
    await this.assertProperty(ctx);
    const data = await this.repository.listHazirunRows(ctx, input.meetingId);
    if (!data) throw new Error("MEETING_NOT_FOUND");

    const document = buildHazirunDocument({
      locale: input.locale,
      propertyName: data.meeting.property.name,
      organizationName: data.meeting.property.organization.name,
      meetingDate: data.meeting.meetingDate,
      meetingTitle: data.meeting.title,
      rows: data.rows,
    });
    const buffer = await renderHazirunPdf(document);
    const datePart = data.meeting.meetingDate.toISOString().slice(0, 10);
    return {
      buffer,
      fileName: `hazirun_${input.propertyId}_${datePart}.pdf`,
    };
  }
}

export function createGovernanceService(): GovernanceService {
  return new GovernanceService();
}
