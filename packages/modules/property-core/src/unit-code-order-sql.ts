import { Prisma } from "@siteyonetim/db";

/** PostgreSQL ORDER BY expression matching `compareUnitCodes` for pagination queries. */
export function unitCodeOrderExpression(tableAlias = "u"): Prisma.Sql {
  const column = Prisma.raw(`${tableAlias}.code`);
  return Prisma.sql`
    CASE
      WHEN TRIM(${column}) ~ '^[0-9]+$' THEN LPAD(TRIM(${column}), 20, '0')
      ELSE TRIM(${column})
    END
  `;
}
