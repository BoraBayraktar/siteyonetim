import type { ReportTableDocument } from "@siteyonetim/reporting-core";

import type { UnitDebtDetailDto } from "./contract";

export type UnitDebtDetailDocumentMeta = {
  locale?: string;
  propertyName?: string;
  organizationName?: string;
  address?: string | null;
  unitLabel: string;
  partyName?: string | null;
};

function formatExportDate(date: Date | string) {
  const value = typeof date === "string" ? new Date(date) : date;
  return value.toISOString().slice(0, 10);
}

function formatOpenLineLabel(line: UnitDebtDetailDto["openLines"][number]) {
  if (
    line.sourceDueDefinitionName &&
    line.sourceMonth != null &&
    line.sourceYear != null
  ) {
    return `${line.dueDefinitionName} (${line.sourceDueDefinitionName} ${line.sourceMonth}/${line.sourceYear})`;
  }
  return `${line.dueDefinitionName} ${line.month}/${line.year}`;
}

export function buildUnitDebtDetailDocument(
  detail: UnitDebtDetailDto,
  periodLabel: string,
  meta: UnitDebtDetailDocumentMeta,
): ReportTableDocument {
  const headers = ["section", "date", "label", "debit", "credit", "balance"];
  const rows: string[][] = [];

  const periodRemaining = detail.period?.periodRemaining ?? detail.row.totalDebt;
  rows.push(["summary", "", meta.unitLabel, "", "", ""]);
  if (meta.partyName) {
    rows.push(["summary", "", meta.partyName, "", "", ""]);
  }
  rows.push(["summary", "", "periodRemaining", "", "", periodRemaining]);
  rows.push(["summary", "", "totalOpenDebt", "", "", detail.row.totalDebt]);
  if (detail.period) {
    rows.push(["summary", "", "periodDebt", "", "", detail.period.periodDebt]);
    rows.push(["summary", "", "periodPaid", "", "", detail.period.periodPaid]);
  }

  for (const line of detail.openLines) {
    rows.push(["openLine", "", formatOpenLineLabel(line), line.remaining, "", ""]);
  }

  for (const line of detail.statement) {
    rows.push([
      "statement",
      formatExportDate(line.date),
      line.label,
      line.debit !== "0" ? line.debit : "",
      line.credit !== "0" ? line.credit : "",
      line.balance,
    ]);
  }

  return {
    title: `${meta.unitLabel} — ${periodLabel}`,
    headers,
    rows,
    meta: {
      locale: meta.locale,
      propertyName: meta.propertyName,
      organizationName: meta.organizationName,
      subtitle: meta.address ?? undefined,
      periodLabel,
      generatedAt: new Date().toISOString().slice(0, 10),
      documentKind: "STANDARD",
      layout: "portrait",
    },
  };
}
