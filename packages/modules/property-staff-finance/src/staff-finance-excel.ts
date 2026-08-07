import ExcelJS from "exceljs";

import type { StaffAccountMovementDto, StaffProfileDto } from "./contract";

export const STAFF_FINANCE_XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function headers(locale: string) {
  if (locale.startsWith("en")) {
    return {
      profilesSheet: "Staff balances",
      statementSheet: "Staff statement",
      titleBalances: "Staff current account balances",
      titleStatement: "Staff current account statement",
      staff: "Staff",
      staffNo: "Staff no",
      title: "Title",
      department: "Department",
      accountCode: "Account code",
      status: "Status",
      balance: "Balance",
      date: "Date",
      period: "Period",
      movementType: "Movement type",
      amount: "Amount",
      documentNo: "Document no",
      description: "Description",
    };
  }
  return {
    profilesSheet: "Personel bakiyeleri",
    statementSheet: "Personel ekstresi",
    titleBalances: "Personel cari bakiye listesi",
    titleStatement: "Personel cari ekstresi",
    staff: "Personel",
    staffNo: "Personel no",
    title: "Görev",
    department: "Departman",
    accountCode: "Cari kodu",
    status: "Durum",
    balance: "Bakiye",
    date: "Tarih",
    period: "Dönem",
    movementType: "Hareket türü",
    amount: "Tutar",
    documentNo: "Belge no",
    description: "Açıklama",
  };
}

function safeFilePart(value: string) {
  return value
    .trim()
    .replace(/[^\p{L}\p{N}\-_]+/gu, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

function formatDate(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function applyHeaderStyle(sheet: ExcelJS.Worksheet, headerRow: number) {
  sheet.getRow(1).font = { bold: true, size: 12 };
  sheet.getRow(headerRow).font = { bold: true };
}

export async function buildStaffFinanceXlsxBuffer(input: {
  locale: string;
  propertyName: string;
  profiles: StaffProfileDto[];
  statement?: {
    profile: StaffProfileDto;
    movements: StaffAccountMovementDto[];
  } | null;
}): Promise<Buffer> {
  const labels = headers(input.locale);
  const workbook = new ExcelJS.Workbook();
  const profilesSheet = workbook.addWorksheet(labels.profilesSheet);

  profilesSheet.addRow([input.propertyName]);
  profilesSheet.addRow([labels.titleBalances]);
  profilesSheet.addRow([]);
  profilesSheet.addRow([
    labels.staff,
    labels.staffNo,
    labels.title,
    labels.department,
    labels.accountCode,
    labels.status,
    labels.balance,
  ]);
  for (const profile of input.profiles) {
    profilesSheet.addRow([
      profile.partyName,
      profile.staffNo ?? "",
      profile.title ?? "",
      profile.department ?? "",
      profile.financeAccountCode,
      profile.status,
      Number(profile.balance),
    ]);
  }
  applyHeaderStyle(profilesSheet, 4);
  profilesSheet.columns = [
    { width: 28 },
    { width: 16 },
    { width: 20 },
    { width: 20 },
    { width: 18 },
    { width: 14 },
    { width: 16 },
  ];

  if (input.statement) {
    const statementSheet = workbook.addWorksheet(labels.statementSheet);
    statementSheet.addRow([input.propertyName]);
    statementSheet.addRow([`${labels.titleStatement}: ${input.statement.profile.partyName}`]);
    statementSheet.addRow([]);
    statementSheet.addRow([
      labels.date,
      labels.period,
      labels.movementType,
      labels.amount,
      labels.documentNo,
      labels.description,
    ]);
    for (const movement of input.statement.movements) {
      statementSheet.addRow([
        formatDate(movement.movementDate),
        `${movement.periodMonth}/${movement.periodYear}`,
        movement.movementType,
        Number(movement.amount),
        movement.documentNo ?? "",
        movement.description ?? "",
      ]);
    }
    applyHeaderStyle(statementSheet, 4);
    statementSheet.columns = [
      { width: 14 },
      { width: 12 },
      { width: 24 },
      { width: 16 },
      { width: 18 },
      { width: 36 },
    ];
  }

  const raw = await workbook.xlsx.writeBuffer();
  return Buffer.from(raw);
}

export function staffFinanceFileName(propertyName: string, locale: string, statement: boolean): string {
  const base = safeFilePart(propertyName) || "property";
  if (locale.startsWith("en")) {
    return statement ? `${base}-staff-statement.xlsx` : `${base}-staff-balances.xlsx`;
  }
  return statement ? `${base}-personel-ekstresi.xlsx` : `${base}-personel-bakiyeleri.xlsx`;
}
