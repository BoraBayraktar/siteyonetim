import { Prisma, prisma } from "@siteyonetim/db";

import type { CreateUnitInput, DeleteUnitInput, ListUnitsInput, UnitDto, UpdateUnitInput } from "./contract";
import { notDeleted, PropertyScopeRepository } from "./scope.repository";
import { unitCodeOrderExpression } from "./unit-code-order-sql";
import { isMalformedImportUnitCode } from "./unit-import-parse";

type UnitListRow = {
  id: string;
  propertyId: string;
  blockId: string | null;
  blockName: string | null;
  code: string;
  floor: number | null;
  areaM2: string | null;
  shareRatio: string | null;
};

function mapUnitRow(row: UnitListRow): UnitDto {
  return {
    id: row.id,
    propertyId: row.propertyId,
    blockId: row.blockId,
    blockName: row.blockName,
    code: row.code,
    floor: row.floor,
    areaM2: row.areaM2,
    shareRatio: row.shareRatio,
  };
}

export class UnitRepository {
  constructor(private readonly scope = new PropertyScopeRepository()) {}

  async listPaginated(input: ListUnitsInput): Promise<{ rows: UnitDto[]; total: number }> {
    const allowed = await this.scope.assertPropertyInOrganization(input.organizationId, input.propertyId);
    if (!allowed) {
      return { rows: [], total: 0 };
    }

    const page = Math.max(1, input.page);
    const pageSize = Math.min(Math.max(input.pageSize, 1), 500);
    const skip = (page - 1) * pageSize;
    const blockFilter = input.blockId
      ? Prisma.sql`AND u."blockId" = ${input.blockId}`
      : Prisma.empty;

    const [rows, countRows] = await Promise.all([
      prisma.$queryRaw<UnitListRow[]>`
        SELECT
          u.id,
          u."propertyId",
          u."blockId",
          b.name AS "blockName",
          u.code,
          u.floor,
          u."areaM2"::text AS "areaM2",
          u."shareRatio"::text AS "shareRatio"
        FROM "Unit" u
        LEFT JOIN "Block" b ON b.id = u."blockId" AND b.deleted = false
        WHERE u."propertyId" = ${input.propertyId}
          AND u.deleted = false
          ${blockFilter}
        ORDER BY ${unitCodeOrderExpression("u")} ASC
        LIMIT ${pageSize}
        OFFSET ${skip}
      `,
      prisma.$queryRaw<Array<{ total: bigint }>>`
        SELECT COUNT(*)::bigint AS total
        FROM "Unit" u
        WHERE u."propertyId" = ${input.propertyId}
          AND u.deleted = false
          ${blockFilter}
      `,
    ]);

    return {
      rows: rows.map(mapUnitRow),
      total: Number(countRows[0]?.total ?? BigInt(0)),
    };
  }

  async create(input: CreateUnitInput): Promise<UnitDto | null> {
    const allowed = await this.scope.assertPropertyInOrganization(input.organizationId, input.propertyId);
    if (!allowed) {
      return null;
    }

    if (input.blockId) {
      const blockOk = await this.scope.assertBlockInOrganization(input.organizationId, input.blockId);
      if (!blockOk) {
        return null;
      }
    }

    const created = await prisma.unit.create({
      data: {
        propertyId: input.propertyId,
        blockId: input.blockId ?? null,
        code: input.code,
        floor: input.floor ?? null,
        areaM2: input.areaM2 ? new Prisma.Decimal(input.areaM2) : null,
        shareRatio: input.shareRatio ? new Prisma.Decimal(input.shareRatio) : null,
      },
      include: {
        block: { select: { name: true } },
      },
    });

    return {
      id: created.id,
      propertyId: created.propertyId,
      blockId: created.blockId,
      blockName: created.block?.name ?? null,
      code: created.code,
      floor: created.floor,
      areaM2: created.areaM2?.toString() ?? null,
      shareRatio: created.shareRatio?.toString() ?? null,
    };
  }

  async findByCode(propertyId: string, code: string) {
    return prisma.unit.findFirst({
      where: { propertyId, code, ...notDeleted },
    });
  }

  async findAnyByCode(propertyId: string, code: string) {
    return prisma.unit.findFirst({
      where: { propertyId, code },
    });
  }

  async upsertFromImport(
    input: UpdateUnitInput & { actorUserId?: string | null },
    restore: boolean,
  ): Promise<UnitDto | null> {
    const allowed = await this.scope.assertPropertyInOrganization(input.organizationId, input.propertyId);
    if (!allowed) {
      return null;
    }

    const existing = await prisma.unit.findFirst({
      where: { id: input.unitId, propertyId: input.propertyId },
    });
    if (!existing) {
      return null;
    }

    if (input.blockId) {
      const blockOk = await this.scope.assertBlockInOrganization(input.organizationId, input.blockId);
      if (!blockOk) {
        return null;
      }
    }

    const updated = await prisma.unit.update({
      where: { id: input.unitId },
      data: {
        ...(restore
          ? { deleted: false, deletedDate: null, deletedUserId: null }
          : {}),
        blockId: input.blockId ?? null,
        code: input.code,
        floor: input.floor ?? null,
        areaM2: input.areaM2 ? new Prisma.Decimal(input.areaM2) : null,
        shareRatio: input.shareRatio ? new Prisma.Decimal(input.shareRatio) : null,
      },
      include: {
        block: { select: { name: true } },
      },
    });

    return {
      id: updated.id,
      propertyId: updated.propertyId,
      blockId: updated.blockId,
      blockName: updated.block?.name ?? null,
      code: updated.code,
      floor: updated.floor,
      areaM2: updated.areaM2?.toString() ?? null,
      shareRatio: updated.shareRatio?.toString() ?? null,
    };
  }

  async listBlocksByProperty(propertyId: string) {
    return prisma.block.findMany({
      where: { propertyId, ...notDeleted },
      select: { id: true, name: true },
    });
  }

  async update(input: UpdateUnitInput): Promise<UnitDto | null> {
    const allowed = await this.scope.assertPropertyInOrganization(input.organizationId, input.propertyId);
    if (!allowed) {
      return null;
    }

    const existing = await prisma.unit.findFirst({
      where: { id: input.unitId, propertyId: input.propertyId, ...notDeleted },
    });
    if (!existing) {
      return null;
    }

    if (input.blockId) {
      const blockOk = await this.scope.assertBlockInOrganization(input.organizationId, input.blockId);
      if (!blockOk) {
        return null;
      }
    }

    const updated = await prisma.unit.update({
      where: { id: input.unitId },
      data: {
        blockId: input.blockId ?? null,
        code: input.code,
        floor: input.floor ?? null,
        areaM2: input.areaM2 ? new Prisma.Decimal(input.areaM2) : null,
        shareRatio: input.shareRatio ? new Prisma.Decimal(input.shareRatio) : null,
      },
      include: {
        block: { select: { name: true } },
      },
    });

    return {
      id: updated.id,
      propertyId: updated.propertyId,
      blockId: updated.blockId,
      blockName: updated.block?.name ?? null,
      code: updated.code,
      floor: updated.floor,
      areaM2: updated.areaM2?.toString() ?? null,
      shareRatio: updated.shareRatio?.toString() ?? null,
    };
  }

  async listAllForProperty(
    organizationId: string,
    propertyId: string,
  ): Promise<{ propertyName: string; units: UnitDto[] } | null> {
    const allowed = await this.scope.assertPropertyInOrganization(organizationId, propertyId);
    if (!allowed) {
      return null;
    }

    const property = await prisma.property.findFirst({
      where: { id: propertyId, organizationId, ...notDeleted },
      select: { name: true },
    });
    if (!property) {
      return null;
    }

    const units = await prisma.$queryRaw<UnitListRow[]>`
      SELECT
        u.id,
        u."propertyId",
        u."blockId",
        b.name AS "blockName",
        u.code,
        u.floor,
        u."areaM2"::text AS "areaM2",
        u."shareRatio"::text AS "shareRatio"
      FROM "Unit" u
      LEFT JOIN "Block" b ON b.id = u."blockId" AND b.deleted = false
      WHERE u."propertyId" = ${propertyId}
        AND u.deleted = false
      ORDER BY ${unitCodeOrderExpression("u")} ASC
    `;

    return {
      propertyName: property.name,
      units: units.map(mapUnitRow),
    };
  }

  async softDelete(input: DeleteUnitInput): Promise<boolean> {
    const allowed = await this.scope.assertPropertyInOrganization(input.organizationId, input.propertyId);
    if (!allowed) {
      return false;
    }

    const unit = await prisma.unit.findFirst({
      where: { id: input.unitId, propertyId: input.propertyId, ...notDeleted },
    });
    if (!unit) {
      return false;
    }

    const now = new Date();
    await prisma.$transaction([
      prisma.occupancy.updateMany({
        where: {
          unitId: unit.id,
          deleted: false,
          endDate: null,
        },
        data: { endDate: now },
      }),
      prisma.unit.update({
        where: { id: unit.id },
        data: {
          deleted: true,
          deletedDate: now,
          deletedUserId: input.actorUserId ?? null,
        },
      }),
    ]);
    return true;
  }

  async softDeleteMalformedImportUnits(input: {
    organizationId: string;
    propertyId: string;
    actorUserId?: string | null;
  }): Promise<number> {
    const allowed = await this.scope.assertPropertyInOrganization(input.organizationId, input.propertyId);
    if (!allowed) {
      return 0;
    }

    const units = await prisma.unit.findMany({
      where: { propertyId: input.propertyId, ...notDeleted },
      select: { id: true, code: true },
    });

    const toRemove = units.filter((u) => isMalformedImportUnitCode(u.code));
    if (toRemove.length === 0) {
      return 0;
    }

    const now = new Date();
    const ids = toRemove.map((u) => u.id);

    await prisma.$transaction([
      prisma.occupancy.updateMany({
        where: {
          unitId: { in: ids },
          deleted: false,
          endDate: null,
        },
        data: { endDate: now },
      }),
      prisma.unit.updateMany({
        where: { id: { in: ids } },
        data: {
          deleted: true,
          deletedDate: now,
          deletedUserId: input.actorUserId ?? null,
        },
      }),
    ]);

    return toRemove.length;
  }
}
