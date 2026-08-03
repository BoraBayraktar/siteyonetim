import {
  AuditorReportStatus,
  DocumentCategory,
  DocumentVisibility,
  OrganizationRole,
} from "@siteyonetim/db";
import { createDocumentService } from "@siteyonetim/document-management";
import { createAuditService } from "@siteyonetim/platform-audit";
import { getCacheClient } from "@siteyonetim/platform-cache";
import { createPropertyRbacService } from "@siteyonetim/platform-rbac";
import { createStandardReportingService } from "@siteyonetim/reporting-standard";

import type {
  ApproveAuditorReportInput,
  ArchiveAuditorReportInput,
  AssignAuditorInput,
  AuditorReportServiceContract,
  CreateOrGetDraftInput,
  GetAuditorAssignmentInput,
  GetAuditorReportInput,
  ListAuditorAssignmentsInput,
  ListApprovedAuditorReportsInput,
  ApprovedAuditorReportSummaryDto,
  ReopenAuditorReportInput,
  RevokeAuditorAssignmentInput,
  SaveAuditorReportDraftInput,
  SubmitAuditorReportInput,
} from "./contract";
import { auditorAssignmentCachePrefix, invalidateAuditorAssignmentCache } from "./cache";
import { htmlToPlainLines, MIN_OPINION_TEXT_LENGTH, sanitizeAuditorHtml, stripAuditorHtml } from "./html";
import {
  assertApproveAllowed,
  assertArchiveAllowed,
  assertDraftEditable,
  assertReopenAllowed,
  assertSubmitAllowed,
} from "./report-status";
import { AuditorQuarterReminderRepository } from "./quarter-reminder-repository";
import type { QuarterPeriod } from "./quarter-reminder";
import { AuditorReportRepository } from "./repository";

const ASSIGNMENT_CACHE_TTL_SECONDS = 300;

function canManageAssignments(role: OrganizationRole): boolean {
  return role === OrganizationRole.ORG_ADMIN || role === OrganizationRole.PROPERTY_MANAGER;
}

export class AuditorReportService implements AuditorReportServiceContract {
  constructor(
    private readonly repository = new AuditorReportRepository(),
    private readonly quarterReminders = new AuditorQuarterReminderRepository(),
    private readonly rbac = createPropertyRbacService(),
    private readonly reporting = createStandardReportingService(),
    private readonly documents = createDocumentService(),
    private readonly audit = createAuditService(),
    private readonly cache = getCacheClient(),
  ) {}

  private async bustAssignmentCache(propertyId: string, year: number) {
    await invalidateAuditorAssignmentCache(propertyId, year);
  }

  private assignmentListCacheKey(input: ListAuditorAssignmentsInput) {
    return `${auditorAssignmentCachePrefix(input.propertyId, input.year ?? 0)}list:${input.page}:${input.pageSize}:${input.year ?? "all"}`;
  }

  private async assertCanManageProperty(input: {
    organizationId: string;
    propertyId: string;
    actorUserId: string;
    actorOrganizationRole: OrganizationRole;
  }) {
    if (!canManageAssignments(input.actorOrganizationRole)) {
      throw new Error("UNAUTHORIZED");
    }

    const belongs = await this.repository.propertyBelongsToOrg(input.organizationId, input.propertyId);
    if (!belongs) {
      throw new Error("PROPERTY_NOT_FOUND");
    }

    await this.rbac.assertPropertyAccess({
      userId: input.actorUserId,
      organizationId: input.organizationId,
      organizationRole: input.actorOrganizationRole,
      propertyId: input.propertyId,
    });
  }

  private async loadOwnedReport(reportId: string, organizationId: string, propertyId: string, auditorUserId: string) {
    const loaded = await this.repository.findReportById(organizationId, propertyId, reportId);
    if (!loaded) {
      throw new Error("REPORT_NOT_FOUND");
    }
    if (loaded.auditorUserId !== auditorUserId) {
      throw new Error("UNAUTHORIZED");
    }
    return loaded.report;
  }

  async assignAuditor(input: AssignAuditorInput) {
    await this.assertCanManageProperty({
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      actorUserId: input.assignedByUserId,
      actorOrganizationRole: input.actorOrganizationRole,
    });

    const membership = await this.repository.findAuditorMembership(
      input.organizationId,
      input.auditorUserId,
    );
    if (!membership) {
      throw new Error("INVALID_AUDITOR");
    }

    const hasAccess = await this.repository.auditorHasPropertyAccess(
      input.organizationId,
      input.propertyId,
      input.auditorUserId,
    );
    if (!hasAccess) {
      throw new Error("AUDITOR_PROPERTY_ACCESS_REQUIRED");
    }

    const existing = await this.repository.findActiveAssignment({
      propertyId: input.propertyId,
      year: input.year,
      period: input.period,
      auditorUserId: input.auditorUserId,
    });
    if (existing) {
      throw new Error("ASSIGNMENT_ALREADY_EXISTS");
    }

    const created = await this.repository.createAssignment(input);

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.assignedByUserId,
      action: "auditor.assign",
      entityType: "AuditorAssignment",
      entityId: created.id,
      metadata: {
        propertyId: input.propertyId,
        year: input.year,
        period: input.period,
        auditorUserId: input.auditorUserId,
      },
    });

    const dto = await this.repository.findAssignmentById(
      input.organizationId,
      input.propertyId,
      created.id,
    );
    if (!dto) {
      throw new Error("ASSIGNMENT_NOT_FOUND");
    }

    await this.bustAssignmentCache(input.propertyId, input.year);
    return dto;
  }

  async listAssignments(input: ListAuditorAssignmentsInput) {
    const cacheKey = this.assignmentListCacheKey(input);
    const cached = await this.cache.get<{
      items: Awaited<ReturnType<AuditorReportRepository["listAssignments"]>>["rows"];
      total: number;
    }>(cacheKey);

    if (cached) {
      return {
        items: cached.items,
        total: cached.total,
        page: input.page,
        pageSize: input.pageSize,
      };
    }

    const { rows, total } = await this.repository.listAssignments(input);
    await this.cache.set(cacheKey, { items: rows, total }, ASSIGNMENT_CACHE_TTL_SECONDS);

    return {
      items: rows,
      total,
      page: input.page,
      pageSize: input.pageSize,
    };
  }

  async getAssignmentForAuditor(input: GetAuditorAssignmentInput) {
    return this.repository.findAssignmentForAuditor(input);
  }

  async revokeAssignment(input: RevokeAuditorAssignmentInput) {
    await this.assertCanManageProperty({
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      actorUserId: input.actorUserId,
      actorOrganizationRole: input.actorOrganizationRole,
    });

    const assignment = await this.repository.findAssignmentById(
      input.organizationId,
      input.propertyId,
      input.assignmentId,
    );
    if (!assignment) {
      throw new Error("ASSIGNMENT_NOT_FOUND");
    }

    const hasApproved = await this.repository.hasApprovedReport(input.assignmentId);
    if (hasApproved) {
      throw new Error("APPROVED_REPORT_EXISTS");
    }

    await this.repository.softDeleteAssignment(input.assignmentId, input.actorUserId);

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "auditor.revoke",
      entityType: "AuditorAssignment",
      entityId: input.assignmentId,
      metadata: {
        propertyId: input.propertyId,
        year: assignment.year,
        period: assignment.period,
        auditorUserId: assignment.auditorUserId,
      },
    });

    await this.bustAssignmentCache(input.propertyId, assignment.year);
  }

  async createOrGetDraft(input: CreateOrGetDraftInput) {
    const assignment = await this.repository.findAssignmentOwnedByAuditor(
      input.organizationId,
      input.propertyId,
      input.assignmentId,
      input.auditorUserId,
    );
    if (!assignment) {
      throw new Error("ASSIGNMENT_NOT_FOUND");
    }

    const existing = await this.repository.findReportByAssignment(input.assignmentId);
    if (existing) {
      return existing;
    }

    const created = await this.repository.createReport({
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      assignmentId: input.assignmentId,
      year: assignment.year,
      period: assignment.period,
    });

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.auditorUserId,
      action: "auditor.report.createDraft",
      entityType: "AuditorReport",
      entityId: created.id,
      metadata: {
        propertyId: input.propertyId,
        assignmentId: input.assignmentId,
        year: assignment.year,
        period: assignment.period,
      },
    });

    await this.bustAssignmentCache(input.propertyId, assignment.year);
    return created;
  }

  async getReport(input: GetAuditorReportInput) {
    const loaded = await this.repository.findReportById(
      input.organizationId,
      input.propertyId,
      input.reportId,
    );
    return loaded?.report ?? null;
  }

  async saveDraft(input: SaveAuditorReportDraftInput) {
    const report = await this.loadOwnedReport(
      input.reportId,
      input.organizationId,
      input.propertyId,
      input.auditorUserId,
    );

    assertDraftEditable(report.status);

    const findingsHtml = input.findingsHtml != null ? sanitizeAuditorHtml(input.findingsHtml) : null;
    const opinionHtml = input.opinionHtml != null ? sanitizeAuditorHtml(input.opinionHtml) : null;

    const updated = await this.repository.updateReportDraft(input.reportId, {
      findingsHtml,
      opinionHtml,
      dischargeRecommendation: input.dischargeRecommendation ?? null,
    });

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.auditorUserId,
      action: "auditor.report.saveDraft",
      entityType: "AuditorReport",
      entityId: input.reportId,
      metadata: { propertyId: input.propertyId, status: updated.status },
    });

    return updated;
  }

  async submitForReview(input: SubmitAuditorReportInput) {
    const report = await this.loadOwnedReport(
      input.reportId,
      input.organizationId,
      input.propertyId,
      input.auditorUserId,
    );

    assertSubmitAllowed(report.status);

    const opinionText = stripAuditorHtml(report.opinionHtml ?? "");
    if (opinionText.length < MIN_OPINION_TEXT_LENGTH) {
      throw new Error("OPINION_TOO_SHORT");
    }

    const updated = await this.repository.updateReportStatus(input.reportId, {
      status: AuditorReportStatus.IN_REVIEW,
      submittedAt: new Date(),
    });

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.auditorUserId,
      action: "auditor.report.submit",
      entityType: "AuditorReport",
      entityId: input.reportId,
      metadata: { propertyId: input.propertyId },
    });

    await this.bustAssignmentCache(input.propertyId, report.year);
    return updated;
  }

  async approve(input: ApproveAuditorReportInput) {
    await this.assertCanManageProperty({
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      actorUserId: input.actorUserId,
      actorOrganizationRole: input.actorOrganizationRole,
    });

    const loaded = await this.repository.findReportById(
      input.organizationId,
      input.propertyId,
      input.reportId,
    );
    if (!loaded) {
      throw new Error("REPORT_NOT_FOUND");
    }

    const report = loaded.report;
    assertApproveAllowed(report.status);

    const locale = input.locale ?? "tr";
    const findingsLines = report.findingsHtml ? htmlToPlainLines(report.findingsHtml) : [];
    const opinionLines = report.opinionHtml ? htmlToPlainLines(report.opinionHtml) : [];

    const rendered = await this.reporting.exportAuditorReportTemplate({
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      year: report.year,
      month: 1,
      actorUserId: input.actorUserId,
      locale,
      auditorPeriod: report.period,
      opinionOverride: {
        findingsLines,
        opinionLines,
        dischargeRecommendation: report.dischargeRecommendation,
      },
    });

    const fileName = `denetci-raporu_${report.year}_${report.period.toLowerCase()}.pdf`;
    const archived = await this.documents.create({
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      title:
        locale === "en"
          ? `Auditor report ${report.year} (${report.period})`
          : `Denetçi raporu ${report.year} (${report.period})`,
      category: DocumentCategory.AUDITOR_REPORT,
      visibility: DocumentVisibility.ADMIN_ONLY,
      fileName,
      mimeType: rendered.contentType,
      fileBuffer: rendered.buffer,
      actorUserId: input.actorUserId,
    });

    const updated = await this.repository.updateReportStatus(input.reportId, {
      status: AuditorReportStatus.APPROVED,
      approvedAt: new Date(),
      approvedByUserId: input.actorUserId,
      finalizedPdfKey: archived.id,
    });

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "auditor.approve",
      entityType: "AuditorReport",
      entityId: input.reportId,
      metadata: {
        propertyId: input.propertyId,
        documentId: archived.id,
        year: report.year,
        period: report.period,
      },
    });

    await this.bustAssignmentCache(input.propertyId, report.year);
    return updated;
  }

  async reopen(input: ReopenAuditorReportInput) {
    await this.assertCanManageProperty({
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      actorUserId: input.actorUserId,
      actorOrganizationRole: input.actorOrganizationRole,
    });

    const reason = input.reason.trim();
    if (reason.length < 10) {
      throw new Error("REOPEN_REASON_REQUIRED");
    }

    const loaded = await this.repository.findReportById(
      input.organizationId,
      input.propertyId,
      input.reportId,
    );
    if (!loaded) {
      throw new Error("REPORT_NOT_FOUND");
    }

    assertReopenAllowed(loaded.report.status);

    const updated = await this.repository.updateReportStatus(input.reportId, {
      status: AuditorReportStatus.IN_REVIEW,
      approvedAt: null,
      approvedByUserId: null,
    });

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "auditor.reopen",
      entityType: "AuditorReport",
      entityId: input.reportId,
      metadata: {
        propertyId: input.propertyId,
        reason,
      },
    });

    await this.bustAssignmentCache(input.propertyId, loaded.report.year);
    return updated;
  }

  async archive(input: ArchiveAuditorReportInput) {
    await this.assertCanManageProperty({
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      actorUserId: input.actorUserId,
      actorOrganizationRole: input.actorOrganizationRole,
    });

    const loaded = await this.repository.findReportById(
      input.organizationId,
      input.propertyId,
      input.reportId,
    );
    if (!loaded) {
      throw new Error("REPORT_NOT_FOUND");
    }

    assertArchiveAllowed(loaded.report.status);

    const updated = await this.repository.updateReportStatus(input.reportId, {
      status: AuditorReportStatus.ARCHIVED,
    });

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "auditor.archive",
      entityType: "AuditorReport",
      entityId: input.reportId,
      metadata: { propertyId: input.propertyId, year: loaded.report.year },
    });

    await this.bustAssignmentCache(input.propertyId, loaded.report.year);
    return updated;
  }

  async listQuarterReminderTargets(year: number, period: QuarterPeriod) {
    return this.quarterReminders.listReminderTargets(year, period);
  }

  async listApprovedReports(input: ListApprovedAuditorReportsInput): Promise<ApprovedAuditorReportSummaryDto[]> {
    return this.repository.listApprovedReports(input.organizationId, input.propertyId, input.year);
  }
}

export function createAuditorReportService(): AuditorReportService {
  return new AuditorReportService();
}
