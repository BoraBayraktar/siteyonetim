import {
  DueAccrualLineKind,
  DueAccrualStatus,
  DueLineStatus,
  OccupancyRole,
  Prisma,
  prisma,
} from "@siteyonetim/db";

import type { ListPeriodRegisterInput } from "./contract";

export type PeriodRegisterUnitRow = {
  unitId: string;
  unitCode: string;
  blockId: string | null;
  blockName: string | null;
  partyId: string | null;
  partyName: string | null;
  periodDebt: string;
  periodPaid: string;
  periodRemaining: string;
  totalOpenDebt: string;
  aging0To30: string;
  aging31To60: string;
  aging61Plus: string;
  total_count: bigint;
};

export type PeriodRegisterLineRow = {
  unitId: string;
  lineId: string;
  dueDefinitionId: string;
  dueDefinitionName: string;
  amount: string;
  paidAmount: string;
  remaining: string;
  status: DueLineStatus;
  lineKind: DueAccrualLineKind;
  lastDocumentNo: string | null;
  isOverdue: boolean;
};

export async function queryPeriodRegisterUnitsPaginated(
  input: ListPeriodRegisterInput & { dueDay: number },
): Promise<{ units: Omit<PeriodRegisterUnitRow, "total_count">[]; total: number }> {
  const page = Math.max(1, input.page);
  const pageSize = Math.min(Math.max(input.pageSize, 1), 100);
  const skip = (page - 1) * pageSize;
  const q = input.q?.trim().toLowerCase() ?? "";
  const dueDay = Math.min(Math.max(input.dueDay, 1), 28);

  const filterSql = Prisma.sql`
    ${q
      ? Prisma.sql`AND (
          LOWER(TRIM(fu."unitCode")) = ${q}
          OR LOWER(COALESCE(fu."partyName", '')) LIKE ${`%${q}%`}
          OR LOWER(COALESCE(fu."blockName", '')) LIKE ${`%${q}%`}
        )`
      : Prisma.empty}
    ${input.blockId ? Prisma.sql`AND fu."blockId" = ${input.blockId}` : Prisma.empty}
    ${input.overdueOnly
      ? Prisma.sql`AND (fu."aging31To60"::numeric + fu."aging61Plus"::numeric) > 0`
      : Prisma.empty}
    ${input.withDebtOnly
      ? Prisma.sql`AND (fu."periodRemaining"::numeric > 0 OR fu."totalOpenDebt"::numeric > 0)`
      : Prisma.empty}
  `;

  const rows = await prisma.$queryRaw<PeriodRegisterUnitRow[]>`
    WITH open_lines AS (
      SELECT
        l."unitId" AS unit_id,
        (l.amount - l."paidAmount") AS remaining,
        ar.year,
        ar.month
      FROM "DueAccrualLine" l
      INNER JOIN "DueAccrualRun" ar ON ar.id = l."accrualRunId"
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
    debt_by_unit AS (
      SELECT
        lb.unit_id AS "unitId",
        COALESCE(SUM(lb.remaining), 0)::text AS "totalOpenDebt",
        COALESCE(SUM(CASE WHEN lb.overdue_days <= 30 THEN lb.remaining ELSE 0 END), 0)::text AS "aging0To30",
        COALESCE(
          SUM(CASE WHEN lb.overdue_days > 30 AND lb.overdue_days <= 60 THEN lb.remaining ELSE 0 END),
          0
        )::text AS "aging31To60",
        COALESCE(SUM(CASE WHEN lb.overdue_days > 60 THEN lb.remaining ELSE 0 END), 0)::text AS "aging61Plus"
      FROM line_buckets lb
      GROUP BY lb.unit_id
    ),
    period_lines AS (
      SELECT
        l."unitId",
        l.amount,
        l."paidAmount"
      FROM "DueAccrualLine" l
      INNER JOIN "DueAccrualRun" ar ON ar.id = l."accrualRunId"
      WHERE l.deleted = false
        AND ar.deleted = false
        AND ar.status = ${DueAccrualStatus.POSTED}::"DueAccrualStatus"
        AND ar."propertyId" = ${input.propertyId}
        AND ar."organizationId" = ${input.organizationId}
        AND ar.year = ${input.year}
        AND ar.month = ${input.month}
    ),
    period_by_unit AS (
      SELECT
        pl."unitId",
        COALESCE(SUM(pl.amount), 0)::text AS "periodDebt",
        COALESCE(SUM(pl."paidAmount"), 0)::text AS "periodPaid",
        COALESCE(SUM(pl.amount - pl."paidAmount"), 0)::text AS "periodRemaining"
      FROM period_lines pl
      GROUP BY pl."unitId"
    ),
    all_units AS (
      SELECT
        u.id AS "unitId",
        u.code AS "unitCode",
        u."blockId",
        b.name AS "blockName",
        occ."partyId",
        occ_party."displayName" AS "partyName"
      FROM "Unit" u
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
      WHERE u."propertyId" = ${input.propertyId}
        AND u.deleted = false
    ),
    filtered_units AS (
      SELECT
        au."unitId",
        au."unitCode",
        au."blockId",
        au."blockName",
        au."partyId",
        au."partyName",
        COALESCE(pbu."periodDebt", '0') AS "periodDebt",
        COALESCE(pbu."periodPaid", '0') AS "periodPaid",
        COALESCE(pbu."periodRemaining", '0') AS "periodRemaining",
        COALESCE(dbu."totalOpenDebt", '0') AS "totalOpenDebt",
        COALESCE(dbu."aging0To30", '0') AS "aging0To30",
        COALESCE(dbu."aging31To60", '0') AS "aging31To60",
        COALESCE(dbu."aging61Plus", '0') AS "aging61Plus"
      FROM all_units au
      LEFT JOIN period_by_unit pbu ON pbu."unitId" = au."unitId"
      LEFT JOIN debt_by_unit dbu ON dbu."unitId" = au."unitId"
    )
    SELECT
      fu."unitId",
      fu."unitCode",
      fu."blockId",
      fu."blockName",
      fu."partyId",
      fu."partyName",
      fu."periodDebt",
      fu."periodPaid",
      fu."periodRemaining",
      fu."totalOpenDebt",
      fu."aging0To30",
      fu."aging31To60",
      fu."aging61Plus",
      COUNT(*) OVER() AS total_count
    FROM filtered_units fu
    WHERE 1 = 1
    ${filterSql}
    ORDER BY
      CASE
        WHEN TRIM(fu."unitCode") ~ '^[0-9]+$' THEN LPAD(TRIM(fu."unitCode"), 20, '0')
        ELSE TRIM(fu."unitCode")
      END ASC
    LIMIT ${pageSize}
    OFFSET ${skip}
  `;

  return {
    units: rows.map(({ total_count: _total, ...unit }) => unit),
    total: Number(rows[0]?.total_count ?? BigInt(0)),
  };
}

export async function queryPeriodRegisterLinesForUnits(
  input: ListPeriodRegisterInput & { dueDay: number; unitIds: string[] },
): Promise<PeriodRegisterLineRow[]> {
  if (input.unitIds.length === 0) {
    return [];
  }

  const dueDay = Math.min(Math.max(input.dueDay, 1), 28);

  return prisma.$queryRaw<PeriodRegisterLineRow[]>`
    WITH last_payment AS (
      SELECT DISTINCT ON (pa."dueAccrualLineId")
        pa."dueAccrualLineId",
        pay."documentNo" AS last_document_no
      FROM "PaymentAllocation" pa
      INNER JOIN "Payment" pay ON pay.id = pa."paymentId" AND pay.deleted = false
      WHERE pa.deleted = false
      ORDER BY pa."dueAccrualLineId", pay."paymentDate" DESC, pay."createdAt" DESC
    )
    SELECT
      l."unitId" AS "unitId",
      l.id AS "lineId",
      dd.id AS "dueDefinitionId",
      dd.name AS "dueDefinitionName",
      l.amount::text AS amount,
      l."paidAmount"::text AS "paidAmount",
      (l.amount - l."paidAmount")::text AS remaining,
      l.status AS status,
      l."lineKind" AS "lineKind",
      lp.last_document_no AS "lastDocumentNo",
      (
        (l.amount - l."paidAmount") > 0
        AND (CURRENT_DATE - make_date(ar.year, ar.month, CAST(${dueDay} AS integer))) > 0
      ) AS "isOverdue"
    FROM "DueAccrualLine" l
    INNER JOIN "DueAccrualRun" ar ON ar.id = l."accrualRunId"
    INNER JOIN "DueDefinition" dd ON dd.id = ar."dueDefinitionId" AND dd.deleted = false
    LEFT JOIN last_payment lp ON lp."dueAccrualLineId" = l.id
    WHERE l.deleted = false
      AND ar.deleted = false
      AND ar.status = ${DueAccrualStatus.POSTED}::"DueAccrualStatus"
      AND ar."propertyId" = ${input.propertyId}
      AND ar."organizationId" = ${input.organizationId}
      AND ar.year = ${input.year}
      AND ar.month = ${input.month}
      AND l."unitId" IN (${Prisma.join(input.unitIds)})
    ORDER BY dd.name ASC, l."lineKind" ASC
  `;
}
