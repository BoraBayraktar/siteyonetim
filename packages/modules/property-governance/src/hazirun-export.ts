import type { ReportTableDocument } from "@siteyonetim/reporting-core";

import type { GeneralAssemblyMeetingDetailDto } from "./contract";

function meetingTypeLabel(
  type: GeneralAssemblyMeetingDetailDto["meetingType"],
  locale?: string,
): string {
  if (locale === "en") {
    return type === "ORDINARY" ? "Ordinary general assembly" : "Extraordinary general assembly";
  }
  return type === "ORDINARY" ? "Olağan genel kurul" : "Olağanüstü genel kurul";
}

function attendanceLabel(
  mode: GeneralAssemblyMeetingDetailDto["attendances"][number]["mode"],
  locale?: string,
): string {
  if (locale === "en") {
    const labels = { IN_PERSON: "In person", PROXY: "Proxy", ABSENT: "Absent" };
    return labels[mode];
  }
  const labels = { IN_PERSON: "Bizzat", PROXY: "Vekaleten", ABSENT: "Katılmadı" };
  return labels[mode];
}

export function buildHazirunDocument(
  meeting: GeneralAssemblyMeetingDetailDto,
  propertyName: string,
  locale?: string,
  organizationName?: string,
): ReportTableDocument {
  const dateLabel = meeting.meetingDate.toISOString().slice(0, 10);
  const title =
    locale === "en"
      ? `Attendance register — ${propertyName} — ${dateLabel}`
      : `Hazirun cetveli — ${propertyName} — ${dateLabel}`;

  const headers =
    locale === "en"
      ? ["unit", "block", "owner", "attendance", "proxy", "notes"]
      : ["taşınmaz", "blok", "malik", "katılım", "vekil", "not"];

  const rows = meeting.attendances.map((row) => [
    row.unitCode,
    row.blockName ?? "",
    row.ownerName ?? "",
    attendanceLabel(row.mode, locale),
    row.proxyHolder ?? "",
    row.notes ?? "",
  ]);

  const present = meeting.attendances.filter((a) => a.mode !== "ABSENT").length;
  const footerLabel = locale === "en" ? "Present / total" : "Katılan / toplam";
  const footer = [footerLabel, "", "", `${present} / ${meeting.attendances.length}`, "", ""];

  return {
    title,
    headers,
    rows,
    footer,
    meta: {
      locale,
      propertyName,
      organizationName,
      periodLabel: dateLabel,
      generatedAt: new Date().toISOString().slice(0, 10),
      subtitle: meetingTypeLabel(meeting.meetingType, locale),
      documentRef:
        locale === "en"
          ? `Ref: Attendance register ${dateLabel}`
          : `Ref: Hazirun cetveli ${dateLabel}`,
    },
  };
}
