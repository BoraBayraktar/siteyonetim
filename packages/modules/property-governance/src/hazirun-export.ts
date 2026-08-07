import { ReportExportFormat } from "@siteyonetim/db";
import { createReportingCoreService } from "@siteyonetim/reporting-core";
import type { ReportTableDocument } from "@siteyonetim/reporting-core";

import type { AssemblyAttendanceKind } from "./contract";

type HazirunRow = {
  unitCode: string;
  blockName: string;
  partyName: string;
  attendanceKind: AssemblyAttendanceKind;
  proxyHolderName: string;
};

const attendanceLabelsTr: Record<AssemblyAttendanceKind, string> = {
  PRESENT: "Bizzat",
  PROXY: "Vekaleten",
  ABSENT: "Katılmadı",
};

const attendanceLabelsEn: Record<AssemblyAttendanceKind, string> = {
  PRESENT: "In person",
  PROXY: "By proxy",
  ABSENT: "Absent",
};

export function buildHazirunDocument(input: {
  locale?: string;
  propertyName: string;
  organizationName: string;
  meetingDate: Date;
  meetingTitle: string | null;
  rows: HazirunRow[];
}): ReportTableDocument {
  const locale = input.locale ?? "tr";
  const tr = locale === "tr";
  const labels = tr ? attendanceLabelsTr : attendanceLabelsEn;
  const meetingDateLabel = input.meetingDate.toLocaleDateString(tr ? "tr-TR" : "en-GB");

  return {
    title: tr ? "Hazirun cetveli" : "Attendance register",
    headers: tr
      ? ["Taşınmaz", "Blok", "Malik", "Katılım", "Vekil"]
      : ["Unit", "Block", "Owner", "Attendance", "Proxy holder"],
    rows: input.rows.map((row) => [
      row.unitCode,
      row.blockName,
      row.partyName,
      labels[row.attendanceKind],
      row.proxyHolderName,
    ]),
    footer: [
      tr ? "Toplam taşınmaz" : "Total units",
      String(input.rows.length),
      "",
      "",
      "",
    ],
    meta: {
      locale,
      propertyName: input.propertyName,
      organizationName: input.organizationName,
      periodLabel: meetingDateLabel,
      subtitle: input.meetingTitle ?? (tr ? "Genel kurul toplantısı" : "General assembly meeting"),
      generatedAt: new Date().toISOString().slice(0, 10),
      documentKind: "ATTENDANCE_REGISTER",
    },
  };
}

export async function renderHazirunPdf(document: ReportTableDocument): Promise<Buffer> {
  const rendered = await createReportingCoreService().render(ReportExportFormat.PDF, document);
  return rendered.buffer;
}
