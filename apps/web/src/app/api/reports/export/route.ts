import { ReportExportFormat } from "@siteyonetim/db";
import type { StandardReportKind } from "@siteyonetim/reporting-standard";
import { parseReportQuarter, reportQuarterToMonthRange } from "@siteyonetim/reporting-standard";
import { isAnnualReportKind } from "@/lib/report-kinds";
import { auth } from "@/auth";
import { canAccessReports } from "@/lib/auth-context";
import { getPropertyService, getReportingService } from "@/lib/services";

const KINDS: StandardReportKind[] = [
  "DUE_ACCRUAL_SUMMARY",
  "DUE_COLLECTION",
  "EXPENSE_BREAKDOWN",
  "CASHBOX_SUMMARY",
  "DEBT_AGING",
  "BANK_RECONCILIATION",
  "ANNUAL_INCOME_EXPENSE",
  "AUDITOR_REPORT_TEMPLATE",
  "AUDIT_PACKAGE",
];

function parseKind(raw: string | null): StandardReportKind {
  if (raw && KINDS.includes(raw as StandardReportKind)) {
    return raw as StandardReportKind;
  }
  return "DUE_ACCRUAL_SUMMARY";
}

function parseFormat(raw: string | null, kind: StandardReportKind): ReportExportFormat {
  const value = (raw ?? "csv").toLowerCase();
  if (kind === "AUDIT_PACKAGE") return ReportExportFormat.ZIP;
  if (kind === "AUDITOR_REPORT_TEMPLATE") return ReportExportFormat.PDF;
  if (value === "xlsx") return ReportExportFormat.XLSX;
  if (value === "pdf") return ReportExportFormat.PDF;
  if (value === "zip") return ReportExportFormat.ZIP;
  return ReportExportFormat.CSV;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!canAccessReports(session)) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = new URL(request.url);
  const propertyId = url.searchParams.get("propertyId");
  if (!propertyId) {
    return Response.json({ error: "PROPERTY_REQUIRED" }, { status: 400 });
  }

  const property = await getPropertyService().getById(session!.user!.organizationId, propertyId);
  if (!property) {
    return Response.json({ error: "PROPERTY_NOT_FOUND" }, { status: 404 });
  }

  const kind = parseKind(url.searchParams.get("kind"));
  const format = parseFormat(url.searchParams.get("format"), kind);
  const now = new Date();
  const year = Number(url.searchParams.get("year") ?? now.getFullYear());
  const month = Number(url.searchParams.get("month") ?? now.getMonth() + 1);
  const blockId = url.searchParams.get("blockId") || null;
  const unitCode = url.searchParams.get("unitCode") || null;
  const locale = url.searchParams.get("locale") ?? "tr";
  const quarterMonths = reportQuarterToMonthRange(parseReportQuarter(url.searchParams.get("quarter")));

  if (!isAnnualReportKind(kind) && month !== 0 && (month < 1 || month > 12)) {
    return Response.json({ error: "INVALID_MONTH" }, { status: 400 });
  }

  const filter = {
    organizationId: session!.user!.organizationId,
    propertyId,
    year,
    month: isAnnualReportKind(kind) ? 1 : month,
    blockId,
    unitCode,
    actorUserId: session!.user!.id,
    locale,
    ...quarterMonths,
  };

  try {
    const rendered = await getReportingService().exportReportFile(kind, filter, format);
    const filename = `${kind.toLowerCase()}_${propertyId}_${year}${isAnnualReportKind(kind) ? "" : `-${month}`}.${rendered.extension}`;
    return new Response(new Uint8Array(rendered.buffer), {
      headers: {
        "Content-Type": rendered.contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PROPERTY_NOT_FOUND") {
      return Response.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
