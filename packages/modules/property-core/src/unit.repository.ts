import { Prisma, prisma } from "@siteyonetim/db";

import type { CreateUnitInput, ListUnitsInput, UnitDto } from "./contract";
import { notDeleted, PropertyScopeRepository } from "./scope.repository";

export class UnitRepository {
  constructor(private readonly scope = new PropertyScopeRepository()) {}

  async listPaginated(input: ListUnitsInput): Promise<{ rows: UnitDto[]; total: number }> {
    const allowed = await this.scope.assertPropertyInOrganization(input.organizationId, input.propertyId);
    if (!allowed) {
      return { rows: [], total: 0 };
    }

    const where: Prisma.UnitWhereInput = {
      propertyId: input.propertyId,
      ...notDeleted,
    };
    if (input.blockId) {
      where.blockId = input.blockId;
    }

    const [units, total] = await Promise.all([
      prisma.unit.findMany({
        where,
        orderBy: { code: "asc" },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        include: {
          block: { select: { name: true } },
        },
      }),
      prisma.unit.count({ where }),
    ]);

    return {
      rows: units.map((u) => ({
        id: u.id,
        propertyId: u.propertyId,
        blockId: u.blockId,
        blockName: u.block?.name ?? null,
        code: u.code,
        floor: u.floor,
        areaM2: u.areaM2?.toString() ?? null,
        shareRatio: u.shareRatio?.toString() ?? null,
      })),
      total,
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
}
