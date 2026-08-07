import type {
  AuditorDischargeRecommendation,
  AuditorReportPeriod,
  AuditorReportStatus,
  OrganizationRole,
} from "@siteyonetim/db";

import type { QuarterPeriod } from "./quarter-reminder";
import type { AuditorQuarterReminderTarget } from "./quarter-reminder-repository";

export type AuditorAssignmentDto = {
  id: string;
  organizationId: string;
  propertyId: string;
  year: number;
  period: AuditorReportPeriod;
  auditorUserId: string;
  auditorName: string;
  auditorEmail: string;
  assignedByUserId: string;
  assignedAt: string;
  reportStatus: AuditorReportStatus | null;
  reportId: string | null;
};

export type AuditorReportDto = {
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
  submittedAt: string | null;
  approvedAt: string | null;
  finalizedPdfKey: string | null;
};

export type PaginatedAuditorAssignments = {
  items: AuditorAssignmentDto[];
  total: number;
  page: number;
  pageSize: number;
};

export type AssignAuditorInput = {
  organizationId: string;
  propertyId: string;
  year: number;
  period: AuditorReportPeriod;
  auditorUserId: string;
  assignedByUserId: string;
  actorOrganizationRole: OrganizationRole;
};

export type ListAuditorAssignmentsInput = {
  organizationId: string;
  propertyId: string;
  page: number;
  pageSize: number;
  year?: number;
  auditorUserId?: string;
};

export type RevokeAuditorAssignmentInput = {
  organizationId: string;
  propertyId: string;
  assignmentId: string;
  actorUserId: string;
  actorOrganizationRole: OrganizationRole;
};

export type GetAuditorAssignmentInput = {
  organizationId: string;
  propertyId: string;
  auditorUserId: string;
  year: number;
  period: AuditorReportPeriod;
};

export type CreateOrGetDraftInput = {
  organizationId: string;
  propertyId: string;
  assignmentId: string;
  auditorUserId: string;
};

export type SaveAuditorReportDraftInput = {
  organizationId: string;
  propertyId: string;
  reportId: string;
  auditorUserId: string;
  findingsHtml?: string | null;
  opinionHtml?: string | null;
  dischargeRecommendation?: AuditorDischargeRecommendation | null;
};

export type SubmitAuditorReportInput = {
  organizationId: string;
  propertyId: string;
  reportId: string;
  auditorUserId: string;
};

export type ApproveAuditorReportInput = {
  organizationId: string;
  propertyId: string;
  reportId: string;
  actorUserId: string;
  actorOrganizationRole: OrganizationRole;
  locale?: string;
};

export type ReopenAuditorReportInput = {
  organizationId: string;
  propertyId: string;
  reportId: string;
  actorUserId: string;
  actorOrganizationRole: OrganizationRole;
  reason: string;
};

export type ArchiveAuditorReportInput = {
  organizationId: string;
  propertyId: string;
  reportId: string;
  actorUserId: string;
  actorOrganizationRole: OrganizationRole;
};

export type GetAuditorReportInput = {
  organizationId: string;
  propertyId: string;
  reportId: string;
};

export type ListApprovedAuditorReportsInput = {
  organizationId: string;
  propertyId: string;
  year?: number;
};

export type ApprovedAuditorReportSummaryDto = {
  id: string;
  year: number;
  period: AuditorReportPeriod;
  approvedAt: string | null;
};

export interface AuditorReportServiceContract {
  assignAuditor(input: AssignAuditorInput): Promise<AuditorAssignmentDto>;
  listAssignments(input: ListAuditorAssignmentsInput): Promise<PaginatedAuditorAssignments>;
  getAssignmentForAuditor(input: GetAuditorAssignmentInput): Promise<AuditorAssignmentDto | null>;
  revokeAssignment(input: RevokeAuditorAssignmentInput): Promise<void>;
  createOrGetDraft(input: CreateOrGetDraftInput): Promise<AuditorReportDto>;
  getReport(input: GetAuditorReportInput): Promise<AuditorReportDto | null>;
  saveDraft(input: SaveAuditorReportDraftInput): Promise<AuditorReportDto>;
  submitForReview(input: SubmitAuditorReportInput): Promise<AuditorReportDto>;
  approve(input: ApproveAuditorReportInput): Promise<AuditorReportDto>;
  reopen(input: ReopenAuditorReportInput): Promise<AuditorReportDto>;
  archive(input: ArchiveAuditorReportInput): Promise<AuditorReportDto>;
  listQuarterReminderTargets(
    year: number,
    period: QuarterPeriod,
  ): Promise<AuditorQuarterReminderTarget[]>;
  listApprovedReports(input: ListApprovedAuditorReportsInput): Promise<ApprovedAuditorReportSummaryDto[]>;
}

export type { AuditorDischargeRecommendation, AuditorReportPeriod, AuditorReportStatus };
