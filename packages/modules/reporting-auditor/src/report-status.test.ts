import { AuditorReportStatus } from "@siteyonetim/db";
import { describe, expect, it } from "vitest";

import {
  assertApproveAllowed,
  assertArchiveAllowed,
  assertDraftEditable,
  assertReopenAllowed,
  assertSubmitAllowed,
} from "./report-status";

describe("auditor report status transitions", () => {
  it("allows draft edits only in DRAFT and IN_REVIEW", () => {
    expect(() => assertDraftEditable(AuditorReportStatus.DRAFT)).not.toThrow();
    expect(() => assertDraftEditable(AuditorReportStatus.IN_REVIEW)).not.toThrow();
    expect(() => assertDraftEditable(AuditorReportStatus.APPROVED)).toThrow("REPORT_NOT_EDITABLE");
    expect(() => assertDraftEditable(AuditorReportStatus.ARCHIVED)).toThrow("REPORT_NOT_EDITABLE");
  });

  it("allows submit only from DRAFT", () => {
    expect(() => assertSubmitAllowed(AuditorReportStatus.DRAFT)).not.toThrow();
    expect(() => assertSubmitAllowed(AuditorReportStatus.IN_REVIEW)).toThrow("INVALID_STATUS_TRANSITION");
    expect(() => assertSubmitAllowed(AuditorReportStatus.APPROVED)).toThrow("INVALID_STATUS_TRANSITION");
  });

  it("allows approve only from IN_REVIEW", () => {
    expect(() => assertApproveAllowed(AuditorReportStatus.IN_REVIEW)).not.toThrow();
    expect(() => assertApproveAllowed(AuditorReportStatus.DRAFT)).toThrow("INVALID_STATUS_TRANSITION");
  });

  it("allows reopen and archive only from APPROVED", () => {
    expect(() => assertReopenAllowed(AuditorReportStatus.APPROVED)).not.toThrow();
    expect(() => assertArchiveAllowed(AuditorReportStatus.APPROVED)).not.toThrow();
    expect(() => assertReopenAllowed(AuditorReportStatus.IN_REVIEW)).toThrow("INVALID_STATUS_TRANSITION");
    expect(() => assertArchiveAllowed(AuditorReportStatus.DRAFT)).toThrow("INVALID_STATUS_TRANSITION");
  });
});
