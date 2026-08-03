import type { AuditorReportDocument } from "@siteyonetim/reporting-core";
import type { BoardMinutesSummaryDto } from "@siteyonetim/document-management";
import type { AuditorDischargeRecommendation, AuditorReportPeriod } from "@siteyonetim/db";

import type { AnnualIncomeExpenseReport, PropertyInfoDto, ReportFilter } from "./contract";

export type AuditorOpinionOverride = {
  findingsLines?: string[];
  opinionLines: string[];
  dischargeRecommendation?: AuditorDischargeRecommendation | null;
};

const TR = {
  title: "KAT MALIKLERI DENETIM KURULU RAPORU",
  purposeHeading: "Denetimin amaci ve kapsami",
  purposeLine: (year: number) =>
    `Yonetici tarafindan 01.01.${year} – 31.12.${year} tarihleri arasinda yurutulen mali ve idari islemlerin, 634 sayili Kat Mulkiyeti Kanunu ve yonetim planina uygunlugunun denetlenmesi.`,
  financialHeading: "Mali durum ozeti",
  incomeLine: (amount: string) => `Toplam gelir: ${amount} TL`,
  expenseLine: (amount: string) => `Toplam gider: ${amount} TL`,
  netLine: (amount: string) => `Donem farki (gelir - gider): ${amount} TL`,
  collectionLine: (amount: string) => `Aidat ve tahsilat toplami: ${amount} TL`,
  debtLine: (amount: string) => `Acik borc toplami: ${amount} TL`,
  cashboxLine: (amount: string) => `Kasa/banka bakiyesi: ${amount} TL`,
  budgetLine: (planned: string, actual: string) =>
    `Isletme projesi: planlanan ${planned} TL, gerceklesen ${actual} TL`,
  adminHeading: "Idari degerlendirme",
  adminLines: [
    "Karar defteri, isletme defteri ve mali belgeler dijital ortamda incelenmistir.",
    "Gelir ve gider kayitlari donem icindeki tahsilat ve harcama hareketleriyle karsilastirilmistir.",
    "Asagida tespit edilen hususlar kat malikleri kurulunun bilgisine sunulur.",
  ],
  opinionHeading: "Denetci gorusu ve sonuc",
  opinionLines: [
    "Yapilan denetimler sonucunda yoneticinin genel olarak gorevini yasalara ve yonetim planina uygun sekilde yerine getirdigi tespit edilmistir.",
    "Varsa eksiklikler asagida belirtilmistir:",
    "",
    "........................................................................",
    "",
    "Yoneticinin/yonetim kurulunun ibra edilmesi hususu kat maliklerinin takdirine sunulmaktadir.",
  ],
  signatureHeading: "Denetim kurulu / Denetci",
  signatureLines: ["Denetci: _________________________  Tarih: __/__/____", "Denetci: _________________________  Tarih: __/__/____", "Denetci: _________________________  Tarih: __/__/____"],
};

const EN = {
  title: "OWNERS' ASSOCIATION AUDIT COMMITTEE REPORT",
  purposeHeading: "Purpose and scope of audit",
  purposeLine: (year: number) =>
    `Audit of the manager's financial and administrative operations between 01/01/${year} and 31/12/${year} for compliance with Turkish Condominium Law No. 634 and the management plan.`,
  financialHeading: "Financial summary",
  incomeLine: (amount: string) => `Total income: ${amount} TRY`,
  expenseLine: (amount: string) => `Total expense: ${amount} TRY`,
  netLine: (amount: string) => `Period result (income - expense): ${amount} TRY`,
  collectionLine: (amount: string) => `Dues and collections total: ${amount} TRY`,
  debtLine: (amount: string) => `Total open debt: ${amount} TRY`,
  cashboxLine: (amount: string) => `Cash/bank balance: ${amount} TRY`,
  budgetLine: (planned: string, actual: string) =>
    `Operating budget: planned ${planned} TRY, actual ${actual} TRY`,
  adminHeading: "Administrative review",
  adminLines: [
    "Board minutes, operating ledger and financial documents were reviewed digitally.",
    "Income and expense records were compared with collections and payments during the period.",
    "Findings below are submitted to the owners' association.",
  ],
  opinionHeading: "Auditor opinion and conclusion",
  opinionLines: [
    "Based on the audit, the manager generally performed duties in compliance with laws and the management plan.",
    "Any deficiencies are noted below:",
    "",
    "........................................................................",
    "",
    "The decision on discharge of the manager is submitted to the owners' association.",
  ],
  signatureHeading: "Audit committee / Auditor",
  signatureLines: ["Auditor: _________________________  Date: __/__/____", "Auditor: _________________________  Date: __/__/____", "Auditor: _________________________  Date: __/__/____"],
};

function labels(locale?: string) {
  return locale === "en" ? EN : TR;
}

export function buildAuditorReportDocument(input: {
  filter: ReportFilter;
  property: PropertyInfoDto;
  annual: AnnualIncomeExpenseReport;
  boardMinutes?: BoardMinutesSummaryDto;
  opinionOverride?: AuditorOpinionOverride;
  auditorPeriod?: AuditorReportPeriod;
}): AuditorReportDocument {
  const t = labels(input.filter.locale);
  const periodLabel =
    input.auditorPeriod && input.auditorPeriod !== "ANNUAL"
      ? `${input.filter.year} ${input.auditorPeriod}`
      : input.filter.locale === "en"
        ? `Year ${input.filter.year}`
        : `${input.filter.year} yili`;

  const financialRows = input.annual.rows.map((row) => {
    const cols = [row.label, row.amount];
    if (row.plannedAmount != null) cols.push(row.plannedAmount);
    if (row.variance != null) cols.push(row.variance);
    return cols;
  });

  const hasBudget = input.annual.budgetPlannedTotal != null;
  const financialHeaders = hasBudget
    ? input.filter.locale === "en"
      ? ["Item", "Amount", "Planned", "Variance"]
      : ["Kalem", "Tutar", "Plan", "Fark"]
    : input.filter.locale === "en"
      ? ["Item", "Amount"]
      : ["Kalem", "Tutar"];

  const financialSectionLines = [
    t.incomeLine(input.annual.totalIncome),
    t.expenseLine(input.annual.totalExpense),
    t.netLine(input.annual.netResult),
    t.collectionLine(input.annual.dueCollectionTotal),
    t.debtLine(input.annual.openDebtTotal),
    t.cashboxLine(input.annual.cashboxBalance),
  ];
  if (input.annual.budgetPlannedTotal && input.annual.budgetActualTotal) {
    financialSectionLines.push(
      t.budgetLine(input.annual.budgetPlannedTotal, input.annual.budgetActualTotal),
    );
  }

  return {
    title: t.title,
    meta: {
      locale: input.filter.locale,
      propertyName: input.property.name,
      organizationName: input.property.organizationName,
      periodLabel,
      subtitle: input.property.address ?? undefined,
      generatedAt: new Date().toISOString().slice(0, 10),
    },
    sections: [
      {
        heading: t.purposeHeading,
        lines: [t.purposeLine(input.filter.year)],
      },
      {
        heading: t.financialHeading,
        lines: financialSectionLines,
      },
      {
        heading: t.adminHeading,
        lines: t.adminLines,
      },
    ],
    financialTable: {
      headers: financialHeaders,
      rows: financialRows,
      footer: hasBudget
        ? [
            input.filter.locale === "en" ? "Net" : "Net",
            input.annual.netResult,
            input.annual.budgetPlannedTotal ?? "",
            "",
          ]
        : [input.filter.locale === "en" ? "Net" : "Net", input.annual.netResult],
    },
    opinionHeading: t.opinionHeading,
    opinionLines: input.opinionOverride?.opinionLines?.length
      ? input.opinionOverride.opinionLines
      : t.opinionLines,
    signatureHeading: t.signatureHeading,
    signatureLines: t.signatureLines,
  };
}
