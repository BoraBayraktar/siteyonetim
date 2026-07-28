import { prisma } from "@siteyonetim/db";

import type { AssignOccupancyInput, ListOccupanciesInput, OccupancyDto, PortalOccupancyDto } from "./contract";

const notDeleted = { deleted: false };
const activeOccupancy = { endDate: null, deleted: false };

export class OccupancyRepository {
  async listByProperty(input: ListOccupanciesInput): Promise<{ rows: OccupancyDto[]; total: number }> {
    const where = {
      ...activeOccupancy,
      unit: {
        propertyId: input.propertyId,
        deleted: false,
        property: {
          organizationId: input.organizationId,
          deleted: false,
        },
      },
    };

    const [rows, total] = await Promise.all([
      prisma.occupancy.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        include: {
          party: { select: { id: true, displayName: true } },
          unit: {
            select: {
              id: true,
              code: true,
              propertyId: true,
              property: { select: { name: true } },
            },
          },
        },
      }),
      prisma.occupancy.count({ where }),
    ]);

    return {
      rows: rows.map((o) => ({
        id: o.id,
        unitId: o.unitId,
        unitCode: o.unit.code,
        propertyId: o.unit.propertyId,
        propertyName: o.unit.property.name,
        partyId: o.partyId,
        partyName: o.party.displayName,
        role: o.role,
        startDate: o.startDate,
      })),
      total,
    };
  }

  async assign(input: AssignOccupancyInput): Promise<OccupancyDto | null> {
    const unit = await prisma.unit.findFirst({
      where: {
        id: input.unitId,
        propertyId: input.propertyId,
        deleted: false,
        property: {
          organizationId: input.organizationId,
          deleted: false,
        },
      },
      include: { property: { select: { name: true } } },
    });
    if (!unit) {
      return null;
    }

    const party = await prisma.party.findFirst({
      where: {
        id: input.partyId,
        organizationId: input.organizationId,
        deleted: false,
      },
    });
    if (!party) {
      return null;
    }

    const duplicate = await prisma.occupancy.findFirst({
      where: {
        unitId: input.unitId,
        partyId: input.partyId,
        role: input.role,
        endDate: null,
        deleted: false,
      },
    });
    if (duplicate) {
      throw new Error("OCCUPANCY_DUPLICATE");
    }

    const created = await prisma.occupancy.create({
      data: {
        unitId: input.unitId,
        partyId: input.partyId,
        role: input.role,
      },
      include: {
        party: { select: { displayName: true } },
        unit: {
          select: {
            code: true,
            propertyId: true,
            property: { select: { name: true } },
          },
        },
      },
    });

    return {
      id: created.id,
      unitId: created.unitId,
      unitCode: created.unit.code,
      propertyId: created.unit.propertyId,
      propertyName: created.unit.property.name,
      partyId: created.partyId,
      partyName: created.party.displayName,
      role: created.role,
      startDate: created.startDate,
    };
  }

  async listForPortalUser(userId: string): Promise<PortalOccupancyDto[]> {
    const party = await prisma.party.findFirst({
      where: { portalUserId: userId, deleted: false },
    });
    if (!party) {
      return [];
    }

    const occupancies = await prisma.occupancy.findMany({
      where: {
        partyId: party.id,
        ...activeOccupancy,
        unit: { deleted: false, property: { deleted: false } },
        party: { deleted: false },
      },
      include: {
        unit: {
          include: {
            block: { select: { name: true } },
            property: { select: { name: true, address: true } },
          },
        },
      },
      orderBy: { startDate: "desc" },
    });

    return occupancies.map((o) => ({
      occupancyId: o.id,
      role: o.role,
      unitCode: o.unit.code,
      propertyName: o.unit.property.name,
      propertyAddress: o.unit.property.address,
      blockName: o.unit.block?.name ?? null,
    }));
  }
}
