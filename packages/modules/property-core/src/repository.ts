import { prisma, PropertyKind } from "@siteyonetim/db";

import type { CreatePropertyInput, ListPropertiesInput, PropertyDto } from "./contract";

const notDeleted = { deleted: false };

export class PropertyRepository {
  async listPaginated(input: ListPropertiesInput): Promise<{ rows: PropertyDto[]; total: number }> {
    const where = {
      organizationId: input.organizationId,
      ...notDeleted,
      ...(input.propertyIds?.length ? { id: { in: input.propertyIds } } : {}),
    };

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        include: {
          _count: {
            select: {
              blocks: { where: notDeleted },
              units: { where: notDeleted },
            },
          },
        },
      }),
      prisma.property.count({ where }),
    ]);

    const rows: PropertyDto[] = properties.map((p) => ({
      id: p.id,
      organizationId: p.organizationId,
      kind: p.kind,
      name: p.name,
      address: p.address,
      blockCount: p._count.blocks,
      unitCount: p._count.units,
      createdAt: p.createdAt,
    }));

    return { rows, total };
  }

  async create(input: CreatePropertyInput): Promise<PropertyDto> {
    const created = await prisma.property.create({
      data: {
        organizationId: input.organizationId,
        kind: input.kind as PropertyKind,
        name: input.name,
        address: input.address ?? null,
      },
      include: {
        _count: {
          select: {
            blocks: { where: notDeleted },
            units: { where: notDeleted },
          },
        },
      },
    });

    return {
      id: created.id,
      organizationId: created.organizationId,
      kind: created.kind,
      name: created.name,
      address: created.address,
      blockCount: created._count.blocks,
      unitCount: created._count.units,
      createdAt: created.createdAt,
    };
  }

  async getById(organizationId: string, propertyId: string): Promise<PropertyDto | null> {
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        organizationId,
        ...notDeleted,
      },
      include: {
        _count: {
          select: {
            blocks: { where: notDeleted },
            units: { where: notDeleted },
          },
        },
      },
    });

    if (!property) {
      return null;
    }

    return {
      id: property.id,
      organizationId: property.organizationId,
      kind: property.kind,
      name: property.name,
      address: property.address,
      blockCount: property._count.blocks,
      unitCount: property._count.units,
      createdAt: property.createdAt,
    };
  }

  private toDto(
    property: {
      id: string;
      organizationId: string;
      kind: PropertyKind;
      name: string;
      address: string | null;
      createdAt: Date;
      _count: { blocks: number; units: number };
    },
  ): PropertyDto {
    return {
      id: property.id,
      organizationId: property.organizationId,
      kind: property.kind,
      name: property.name,
      address: property.address,
      blockCount: property._count.blocks,
      unitCount: property._count.units,
      createdAt: property.createdAt,
    };
  }

  async findByIdAny(propertyId: string): Promise<PropertyDto | null> {
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        ...notDeleted,
        organization: { deleted: false },
      },
      include: {
        _count: {
          select: {
            blocks: { where: notDeleted },
            units: { where: notDeleted },
          },
        },
      },
    });

    return property ? this.toDto(property) : null;
  }

  async listNavItemsGlobal(): Promise<Array<{ id: string; name: string }>> {
    return prisma.property.findMany({
      where: {
        ...notDeleted,
        organization: { deleted: false },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  async findShowcaseProperty(): Promise<PropertyDto | null> {
    const property = await prisma.property.findFirst({
      where: {
        ...notDeleted,
        organization: { deleted: false },
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      include: {
        _count: {
          select: {
            blocks: { where: notDeleted },
            units: { where: notDeleted },
          },
        },
      },
    });

    return property ? this.toDto(property) : null;
  }
}
