import { prisma } from "@siteyonetim/db";

import type { BlockDto, CreateBlockInput, ListBlocksInput } from "./contract";
import { notDeleted, PropertyScopeRepository } from "./scope.repository";

export class BlockRepository {
  constructor(private readonly scope = new PropertyScopeRepository()) {}

  async listPaginated(input: ListBlocksInput): Promise<{ rows: BlockDto[]; total: number }> {
    const allowed = await this.scope.assertPropertyInOrganization(input.organizationId, input.propertyId);
    if (!allowed) {
      return { rows: [], total: 0 };
    }

    const where = {
      propertyId: input.propertyId,
      ...notDeleted,
    };

    const [blocks, total] = await Promise.all([
      prisma.block.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        include: {
          _count: {
            select: { units: { where: notDeleted } },
          },
        },
      }),
      prisma.block.count({ where }),
    ]);

    return {
      rows: blocks.map((b) => ({
        id: b.id,
        propertyId: b.propertyId,
        name: b.name,
        sortOrder: b.sortOrder,
        unitCount: b._count.units,
      })),
      total,
    };
  }

  async create(input: CreateBlockInput): Promise<BlockDto | null> {
    const allowed = await this.scope.assertPropertyInOrganization(input.organizationId, input.propertyId);
    if (!allowed) {
      return null;
    }

    const created = await prisma.block.create({
      data: {
        propertyId: input.propertyId,
        name: input.name,
        sortOrder: input.sortOrder ?? 0,
      },
      include: {
        _count: {
          select: { units: { where: notDeleted } },
        },
      },
    });

    return {
      id: created.id,
      propertyId: created.propertyId,
      name: created.name,
      sortOrder: created.sortOrder,
      unitCount: created._count.units,
    };
  }
}
