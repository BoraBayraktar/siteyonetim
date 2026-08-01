"use server";

import { ReportExportFormat } from "@siteyonetim/db";
import type { StandardReportKind } from "@siteyonetim/reporting-standard";
import { isAnnualReportKind } from "@/lib/report-kinds";
import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { canAccessReports } from "@/lib/auth-context";
import { getReportingService } from "@/lib/services";

export type ReportExportActionState = { error?: string; success?: boolean; exportId?: string };

function parseExportFormat(raw: FormDataEntryValue | null, kind: StandardReportKind): ReportExportFormat {
  if (kind === "AUDIT_PACKAGE") return ReportExportFormat.ZIP;
  if (kind === "AUDITOR_REPORT_TEMPLATE") return ReportExportFormat.PDF;
  const value = String(raw ?? "CSV").toUpperCase();
  if (value === "XLSX") return ReportExportFormat.XLSX;
  if (value === "PDF") return ReportExportFormat.PDF;
  if (value === "ZIP") return ReportExportFormat.ZIP;
  return ReportExportFormat.CSV;
}

export async function requestAsyncReportExportAction(
  locale: string,
  propertyId: string,
  _prev: ReportExportActionState,
  formData: FormData,
): Promise<ReportExportActionState> {
  const session = await auth();
  if (!canAccessReports(session)) {
    return { error: "UNAUTHORIZED" };
  }

  const reportKind = String(formData.get("reportKind") ?? "") as StandardReportKind;
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  const blockId = String(formData.get("blockId") ?? "") || null;
  const format = parseExportFormat(formData.get("exportFormat"), reportKind);

  try {
    const created = await getReportingService().requestReportExport({
      organizationId: session!.user!.organizationId,
      propertyId,
      reportKind,
      year,
      month: isAnnualReportKind(reportKind) ? 1 : month,
      blockId,
      format,
      actorUserId: session!.user!.id,
      locale,
    });

    after(async () => {
      await getReportingService().processReportExport(created.id);
    });

    revalidatePath(`/${locale}/admin/properties/${propertyId}/reports`, "page");
    revalidatePath(`/${locale}/auditor/properties/${propertyId}/reports`, "page");
    return { success: true, exportId: created.id };
  } catch (error) {
    if (error instanceof Error) {
      const codes = ["INVALID_MONTH", "PROPERTY_NOT_FOUND", "REPORT_KIND_UNKNOWN"];
      if (codes.includes(error.message)) return { error: error.message };
    }
    throw error;
  }
}
