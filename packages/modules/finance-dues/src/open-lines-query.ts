import {
  DueAccrualLineKind,
  DueAccrualStatus,
  DueLineStatus,
  Prisma,
  prisma,
} from "@siteyonetim/db";

import type { DueAccrualLineDto, ListOpenLinesInput } from "./contract";

type OpenLineQueryRow = {
  id: string;
  unitId: string;
  unitCode: string;
  partyId: string | null;
  partyName: string | null;
  amount: string;
  paidAmount: string;
  remaining: string;
  status: DueLineStatus;
  year: number;
  month: number;
  lineKind: DueAccrualLineKind;
  dueDefinitionName: string;
  total_count: bigint;
};

function mapOpenLine(row: Omit<OpenLineQueryRow, "total_count">): DueAccrualLineDto {
  return {
    id: row.id,
    unitId: row.unitId,
    unitCode: row.unitCode,
    partyId: row.partyId,
    partyName: row.partyName,
    amount: row.amount,
    paidAmount: row.paidAmount,
    remaining: row.remaining,
    status: row.status,
    year: row.year,
    month: row.month,
    lineKind: row.lineKind,
    dueDefinitionName: row.dueDefinitionName,
  };
}

export async function queryOpenLinesPaginated(
  input: ListOpenLinesInput & { dueDay: number },
): Promise<{ items: DueAccrualLineDto[]; total: number }> {
  const page = Math.max(1, input.page);
  const pageSize = Math.min(Math.max(input.pageSize, 1), 100);
  const skip = (page - 1) * pageSize;
  const q = input.q?.trim().toLowerCase() ?? "";
  const dueDay = Math.min(Math.max(input.dueDay, 1), 28);

  const filterSql = Prisma.sql`
    AND (l.amount - l."paidAmount") > 0
    ${q
      ? Prisma.sql`AND (
          LOWER(TRIM(u.code)) = ${q}
          OR LOWER(COALESCE(p."displayName", '')) LIKE ${`%${q}%`}
          OR LOWER(COALESCE(b.name, '')) LIKE ${`%${q}%`}
        )`
      : Prisma.empty}
    ${input.blockId ? Prisma.sql`AND u."blockId" = ${input.blockId}` : Prisma.empty}
    ${input.overdueOnly
      ? Prisma.sql`AND GREATEST(
          0,
          (CURRENT_DATE - make_date(ar.year, ar.month, CAST(${dueDay} AS integer)))::integer
        ) > 30`
      : Prisma.empty}
  `;

  const rows = await prisma.$queryRaw<OpenLineQueryRow[]>`
    SELECT
      l.id,
      u.id AS "unitId",
      u.code AS "unitCode",
      p.id AS "partyId",
      p."displayName" AS "partyName",
      l.amount::text AS amount,
      l."paidAmount"::text AS "paidAmount",
      (l.amount - l."paidAmount")::text AS remaining,
      l.status,
      ar.year,
      ar.month,
      l."lineKind" AS "lineKind",
      dd.name AS "dueDefinitionName",
      COUNT(*) OVER() AS total_count
    FROM "DueAccrualLine" l
    INNER JOIN "DueAccrualRun" ar ON ar.id = l."accrualRunId"
    INNER JOIN "DueDefinition" dd ON dd.id = ar."dueDefinitionId"
    INNER JOIN "Unit" u ON u.id = l."unitId" AND u.deleted = false
    LEFT JOIN "Block" b ON b.id = u."blockId" AND b.deleted = false
    LEFT JOIN "Party" p ON p.id = l."partyId" AND p.deleted = false
    WHERE l.deleted = false
      AND l.status IN (${DueLineStatus.OPEN}::"DueLineStatus", ${DueLineStatus.PARTIAL}::"DueLineStatus")
      AND ar.deleted = false
      AND ar.status = ${DueAccrualStatus.POSTED}::"DueAccrualStatus"
      AND ar."propertyId" = ${input.propertyId}
      AND ar."organizationId" = ${input.organizationId}
      ${filterSql}
    ORDER BY ar.year DESC, ar.month DESC,
      CASE
        WHEN TRIM(u.code) ~ '^[0-9]+$' THEN LPAD(TRIM(u.code), 20, '0')
        ELSE TRIM(u.code)
      END ASC
    LIMIT ${pageSize}
    OFFSET ${skip}
  `;

  return {
    items: rows.map(mapOpenLine),
    total: Number(rows[0]?.total_count ?? BigInt(0)),
  };
}
