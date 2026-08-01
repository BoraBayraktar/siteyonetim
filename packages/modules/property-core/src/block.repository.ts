import { prisma } from "@siteyonetim/db";

import type { BlockDto, CreateBlockInput, DeleteBlockInput, ListBlocksInput, UpdateBlockInput } from "./contract";
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

  async update(input: UpdateBlockInput): Promise<BlockDto | null> {
    const allowed = await this.scope.assertPropertyInOrganization(input.organizationId, input.propertyId);
    if (!allowed) {
      return null;
    }

    const existing = await prisma.block.findFirst({
      where: { id: input.blockId, propertyId: input.propertyId, ...notDeleted },
    });
    if (!existing) {
      return null;
    }

    const updated = await prisma.block.update({
      where: { id: input.blockId },
      data: {
        name: input.name,
        sortOrder: input.sortOrder ?? existing.sortOrder,
      },
      include: {
        _count: {
          select: { units: { where: notDeleted } },
        },
      },
    });

    return {
      id: updated.id,
      propertyId: updated.propertyId,
      name: updated.name,
      sortOrder: updated.sortOrder,
      unitCount: updated._count.units,
    };
  }

  async softDelete(input: DeleteBlockInput): Promise<"ok" | "not_found" | "has_units"> {
    const allowed = await this.scope.assertPropertyInOrganization(input.organizationId, input.propertyId);
    if (!allowed) {
      return "not_found";
    }

    const block = await prisma.block.findFirst({
      where: { id: input.blockId, propertyId: input.propertyId, ...notDeleted },
      include: { _count: { select: { units: { where: notDeleted } } } },
    });
    if (!block) {
      return "not_found";
    }
    if (block._count.units > 0) {
      return "has_units";
    }

    await prisma.block.update({
      where: { id: input.blockId },
      data: {
        deleted: true,
        deletedDate: new Date(),
        deletedUserId: input.actorUserId ?? null,
      },
    });
    return "ok";
  }
}
