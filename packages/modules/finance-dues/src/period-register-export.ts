import { periodRegisterPdfTitle, type ReportTableDocument } from "@siteyonetim/reporting-core";

import type { PeriodRegisterPageDto } from "./contract";

export const PERIOD_REGISTER_EXPORT_PAGE_SIZE = 5000;

export type PeriodRegisterDocumentMeta = {
  locale?: string;
  propertyName?: string;
  organizationName?: string;
  address?: string | null;
};

export function buildPeriodRegisterDocument(
  page: PeriodRegisterPageDto,
  periodLabel: string,
  meta?: PeriodRegisterDocumentMeta,
): ReportTableDocument {
  const headers = [
    "unit",
    "party",
    ...page.columns.map((column) => column.name),
    "periodRemaining",
    "totalOpenDebt",
  ];

  const rows = page.rows.map((row) => [
    row.blockName ? `${row.blockName} / ${row.unitCode}` : row.unitCode,
    row.partyName ?? "",
    ...page.columns.map((column) => {
      const cell = row.cells[column.id];
      if (!cell || cell.status === "NONE" || Number(cell.amount) <= 0) {
        return "";
      }
      const doc = cell.lastDocumentNo ? ` (${cell.lastDocumentNo})` : "";
      return `${cell.paidAmount}/${cell.amount}${doc}`;
    }),
    row.periodRemaining,
    row.totalOpenDebt,
  ]);

  return {
    title: periodRegisterPdfTitle(meta?.locale, periodLabel),
    headers,
    rows,
    footer: ["", "", ...page.columns.map(() => ""), "", ""],
    meta: {
      locale: meta?.locale,
      propertyName: meta?.propertyName,
      organizationName: meta?.organizationName,
      subtitle: meta?.address ?? undefined,
      periodLabel,
      generatedAt: new Date().toISOString().slice(0, 10),
      documentKind: "PERIOD_REGISTER",
      layout: "landscape",
    },
  };
}
