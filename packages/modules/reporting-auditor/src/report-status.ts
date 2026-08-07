import { AuditorReportStatus } from "@siteyonetim/db";

export const EDITABLE_REPORT_STATUSES = new Set<AuditorReportStatus>([
  AuditorReportStatus.DRAFT,
  AuditorReportStatus.IN_REVIEW,
]);

export function assertDraftEditable(status: AuditorReportStatus): void {
  if (!EDITABLE_REPORT_STATUSES.has(status)) {
    throw new Error("REPORT_NOT_EDITABLE");
  }
}

export function assertSubmitAllowed(status: AuditorReportStatus): void {
  if (status !== AuditorReportStatus.DRAFT) {
    throw new Error("INVALID_STATUS_TRANSITION");
  }
}

export function assertApproveAllowed(status: AuditorReportStatus): void {
  if (status !== AuditorReportStatus.IN_REVIEW) {
    throw new Error("INVALID_STATUS_TRANSITION");
  }
}

export function assertReopenAllowed(status: AuditorReportStatus): void {
  if (status !== AuditorReportStatus.APPROVED) {
    throw new Error("INVALID_STATUS_TRANSITION");
  }
}

export function assertArchiveAllowed(status: AuditorReportStatus): void {
  if (status !== AuditorReportStatus.APPROVED) {
    throw new Error("INVALID_STATUS_TRANSITION");
  }
}
