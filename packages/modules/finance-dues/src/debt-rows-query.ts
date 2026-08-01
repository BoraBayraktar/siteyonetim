import {
  DueAccrualStatus,
  DueLineStatus,
  OccupancyRole,
  Prisma,
  prisma,
} from "@siteyonetim/db";

import type { DebtRowDto, ListDebtRowsInput } from "./contract";

type DebtRowQueryRow = {
  unitId: string;
  unitCode: string;
  blockId: string | null;
  blockName: string | null;
  partyId: string | null;
  partyName: string | null;
  totalDebt: string;
  aging0To30: string;
  aging31To60: string;
  aging61Plus: string;
  total_count: bigint;
};

function mapDebtRow(row: Omit<DebtRowQueryRow, "total_count">): DebtRowDto {
  return {
    unitId: row.unitId,
    unitCode: row.unitCode,
    blockId: row.blockId,
    blockName: row.blockName,
    partyId: row.partyId,
    partyName: row.partyName,
    totalDebt: row.totalDebt,
    aging0To30: row.aging0To30,
    aging31To60: row.aging31To60,
    aging61Plus: row.aging61Plus,
  };
}

export async function queryDebtRowsPaginated(
  input: ListDebtRowsInput & { dueDay: number },
): Promise<{ rows: DebtRowDto[]; total: number }> {
  const page = Math.max(1, input.page);
  const pageSize = Math.min(Math.max(input.pageSize, 1), 100);
  const skip = (page - 1) * pageSize;
  const q = input.q?.trim().toLowerCase() ?? "";
  const dueDay = Math.min(Math.max(input.dueDay, 1), 28);

  const filterSql = Prisma.sql`
    ${q
      ? Prisma.sql`AND (
          LOWER(TRIM(ua."unitCode")) = ${q}
          OR LOWER(COALESCE(ua."partyName", '')) LIKE ${`%${q}%`}
          OR LOWER(COALESCE(ua."blockName", '')) LIKE ${`%${q}%`}
        )`
      : Prisma.empty}
    ${input.blockId ? Prisma.sql`AND ua."blockId" = ${input.blockId}` : Prisma.empty}
    ${input.overdueOnly
      ? Prisma.sql`AND (ua."aging31To60"::numeric + ua."aging61Plus"::numeric) > 0`
      : Prisma.empty}
  `;

  const baseCte = Prisma.sql`
    WITH open_lines AS (
      SELECT
        l."unitId" AS unit_id,
        l."partyId" AS line_party_id,
        p."displayName" AS line_party_name,
        (l.amount - l."paidAmount") AS remaining,
        ar.year,
        ar.month
      FROM "DueAccrualLine" l
      INNER JOIN "DueAccrualRun" ar ON ar.id = l."accrualRunId"
      LEFT JOIN "Party" p ON p.id = l."partyId" AND p.deleted = false
      WHERE l.deleted = false
        AND l.status IN (${DueLineStatus.OPEN}::"DueLineStatus", ${DueLineStatus.PARTIAL}::"DueLineStatus")
        AND ar.deleted = false
        AND ar.status = ${DueAccrualStatus.POSTED}::"DueAccrualStatus"
        AND ar."propertyId" = ${input.propertyId}
        AND ar."organizationId" = ${input.organizationId}
        AND (l.amount - l."paidAmount") > 0
    ),
    line_buckets AS (
      SELECT
        ol.*,
        GREATEST(
          0,
          (CURRENT_DATE - make_date(ol.year, ol.month, CAST(${dueDay} AS integer)))::integer
        ) AS overdue_days
      FROM open_lines ol
    ),
    unit_agg AS (
      SELECT
        u.id AS "unitId",
        u.code AS "unitCode",
        u."blockId",
        b.name AS "blockName",
        COALESCE(
          MAX(lb.line_party_id) FILTER (WHERE lb.line_party_id IS NOT NULL),
          occ."partyId"
        ) AS "partyId",
        COALESCE(
          MAX(lb.line_party_name) FILTER (WHERE lb.line_party_name IS NOT NULL),
          occ_party."displayName"
        ) AS "partyName",
        SUM(lb.remaining)::text AS "totalDebt",
        SUM(CASE WHEN lb.overdue_days <= 30 THEN lb.remaining ELSE 0 END)::text AS "aging0To30",
        SUM(
          CASE WHEN lb.overdue_days > 30 AND lb.overdue_days <= 60 THEN lb.remaining ELSE 0 END
        )::text AS "aging31To60",
        SUM(CASE WHEN lb.overdue_days > 60 THEN lb.remaining ELSE 0 END)::text AS "aging61Plus"
      FROM line_buckets lb
      INNER JOIN "Unit" u ON u.id = lb.unit_id AND u.deleted = false
      LEFT JOIN "Block" b ON b.id = u."blockId" AND b.deleted = false
      LEFT JOIN LATERAL (
        SELECT o."partyId"
        FROM "Occupancy" o
        WHERE o."unitId" = u.id
          AND o."endDate" IS NULL
          AND o.deleted = false
        ORDER BY CASE WHEN o.role = ${OccupancyRole.OWNER}::"OccupancyRole" THEN 0 ELSE 1 END
        LIMIT 1
      ) occ ON true
      LEFT JOIN "Party" occ_party ON occ_party.id = occ."partyId" AND occ_party.deleted = false
      GROUP BY u.id, u.code, u."blockId", b.name, occ."partyId", occ_party."displayName"
    )
  `;

  const rows = await prisma.$queryRaw<DebtRowQueryRow[]>`
    ${baseCte}
    SELECT
      ua."unitId",
      ua."unitCode",
      ua."blockId",
      ua."blockName",
      ua."partyId",
      ua."partyName",
      ua."totalDebt",
      ua."aging0To30",
      ua."aging31To60",
      ua."aging61Plus",
      COUNT(*) OVER() AS total_count
    FROM unit_agg ua
    WHERE 1 = 1
    ${filterSql}
    ORDER BY
      CASE
        WHEN TRIM(ua."unitCode") ~ '^[0-9]+$' THEN LPAD(TRIM(ua."unitCode"), 20, '0')
        ELSE TRIM(ua."unitCode")
      END ASC
    LIMIT ${pageSize}
    OFFSET ${skip}
  `;

  return {
    rows: rows.map(mapDebtRow),
    total: Number(rows[0]?.total_count ?? BigInt(0)),
  };
}
