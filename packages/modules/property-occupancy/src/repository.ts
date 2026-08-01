import { OccupancyRole, Prisma, prisma } from "@siteyonetim/db";

import type {
  AssignOccupancyInput,
  EndOccupancyInput,
  GetUnitOccupancyDetailInput,
  ListOccupanciesInput,
  ListUnitBoardInput,
  OccupancyDto,
  OccupancyHistoryDto,
  OccupancySlotDto,
  PortalOccupancyDto,
  SetUnitRoleOccupancyInput,
  UnitOccupancyBoardRowDto,
  UnitOccupancyDetailDto,
  UpdateOccupancyInput,
} from "./contract";

const notDeleted = { deleted: false };
const activeOccupancy = { endDate: null, deleted: false };

function mapSlot(o: {
  id: string;
  partyId: string;
  party: { displayName: string };
}): OccupancySlotDto {
  return {
    occupancyId: o.id,
    partyId: o.partyId,
    partyName: o.party.displayName,
  };
}

function deriveOccupancyStatus(owner: OccupancySlotDto | null, tenant: OccupancySlotDto | null) {
  if (owner && tenant) return "FULL" as const;
  if (owner || tenant) return "PARTIAL" as const;
  return "EMPTY" as const;
}

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

  async listUnitBoard(input: ListUnitBoardInput): Promise<{ rows: UnitOccupancyBoardRowDto[]; total: number }> {
    const page = Math.max(1, input.page);
    const pageSize = Math.min(Math.max(input.pageSize, 1), 500);
    const skip = (page - 1) * pageSize;
    const blockFilter = input.blockId ? Prisma.sql`AND u."blockId" = ${input.blockId}` : Prisma.empty;
    const unassignedFilter = input.unassignedOnly
      ? Prisma.sql`AND NOT EXISTS (
          SELECT 1 FROM "Occupancy" o
          WHERE o."unitId" = u.id
            AND o.role = ${OccupancyRole.OWNER}::"OccupancyRole"
            AND o."endDate" IS NULL
            AND o.deleted = false
        )`
      : Prisma.empty;

    const [unitIds, countRows] = await Promise.all([
      prisma.$queryRaw<Array<{ id: string }>>`
        SELECT u.id
        FROM "Unit" u
        INNER JOIN "Property" p ON p.id = u."propertyId" AND p.deleted = false
        WHERE u."propertyId" = ${input.propertyId}
          AND u.deleted = false
          AND p."organizationId" = ${input.organizationId}
          ${blockFilter}
          ${unassignedFilter}
        ORDER BY
          CASE
            WHEN TRIM(u.code) ~ '^[0-9]+$' THEN LPAD(TRIM(u.code), 20, '0')
            ELSE TRIM(u.code)
          END ASC
        LIMIT ${pageSize}
        OFFSET ${skip}
      `,
      prisma.$queryRaw<Array<{ total: bigint }>>`
        SELECT COUNT(*)::bigint AS total
        FROM "Unit" u
        INNER JOIN "Property" p ON p.id = u."propertyId" AND p.deleted = false
        WHERE u."propertyId" = ${input.propertyId}
          AND u.deleted = false
          AND p."organizationId" = ${input.organizationId}
          ${blockFilter}
          ${unassignedFilter}
      `,
    ]);

    if (unitIds.length === 0) {
      return { rows: [], total: Number(countRows[0]?.total ?? BigInt(0)) };
    }

    const ids = unitIds.map((row) => row.id);
    const units = await prisma.unit.findMany({
      where: { id: { in: ids } },
      include: {
        block: { select: { name: true } },
        occupancies: {
          where: activeOccupancy,
          include: { party: { select: { id: true, displayName: true } } },
        },
      },
    });

    const unitById = new Map(units.map((unit) => [unit.id, unit]));
    const rows = ids.flatMap((id) => {
      const unit = unitById.get(id);
      if (!unit) return [];
      const ownerRow = unit.occupancies.find((o) => o.role === OccupancyRole.OWNER) ?? null;
      const tenantRow = unit.occupancies.find((o) => o.role === OccupancyRole.TENANT) ?? null;
      const owner = ownerRow ? mapSlot(ownerRow) : null;
      const tenant = tenantRow ? mapSlot(tenantRow) : null;
      return [
        {
          unitId: unit.id,
          propertyId: unit.propertyId,
          blockId: unit.blockId,
          blockName: unit.block?.name ?? null,
          code: unit.code,
          floor: unit.floor,
          areaM2: unit.areaM2?.toString() ?? null,
          shareRatio: unit.shareRatio?.toString() ?? null,
          owner,
          tenant,
          occupancyStatus: deriveOccupancyStatus(owner, tenant),
        },
      ];
    });

    return { rows, total: Number(countRows[0]?.total ?? BigInt(0)) };
  }

  async getUnitOccupancyDetail(input: GetUnitOccupancyDetailInput): Promise<UnitOccupancyDetailDto | null> {
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
      include: {
        block: { select: { name: true } },
        occupancies: {
          where: { deleted: false },
          orderBy: [{ endDate: "desc" }, { startDate: "desc" }],
          include: { party: { select: { id: true, displayName: true } } },
        },
      },
    });
    if (!unit) {
      return null;
    }

    const active = unit.occupancies.filter((o) => o.endDate === null);
    const ownerRow = active.find((o) => o.role === OccupancyRole.OWNER) ?? null;
    const tenantRow = active.find((o) => o.role === OccupancyRole.TENANT) ?? null;
    const owner = ownerRow ? mapSlot(ownerRow) : null;
    const tenant = tenantRow ? mapSlot(tenantRow) : null;

    const history: OccupancyHistoryDto[] = unit.occupancies
      .filter((o) => o.endDate !== null)
      .map((o) => ({
        id: o.id,
        partyId: o.partyId,
        partyName: o.party.displayName,
        role: o.role,
        startDate: o.startDate,
        endDate: o.endDate!,
      }));

    return {
      unitId: unit.id,
      propertyId: unit.propertyId,
      blockId: unit.blockId,
      blockName: unit.block?.name ?? null,
      code: unit.code,
      floor: unit.floor,
      areaM2: unit.areaM2?.toString() ?? null,
      shareRatio: unit.shareRatio?.toString() ?? null,
      owner,
      tenant,
      history,
    };
  }

  async findActiveByUnitRole(unitId: string, role: OccupancyRole) {
    return prisma.occupancy.findFirst({
      where: {
        unitId,
        role,
        ...activeOccupancy,
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
  }

  async setUnitRoleOccupancy(input: SetUnitRoleOccupancyInput): Promise<OccupancyDto | null> {
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

    const existing = await this.findActiveByUnitRole(input.unitId, input.role);

    if (!input.partyId) {
      if (existing) {
        await prisma.occupancy.update({
          where: { id: existing.id },
          data: { endDate: new Date() },
        });
      }
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

    if (existing) {
      if (existing.partyId === input.partyId) {
        return this.toDto(existing);
      }
      await prisma.occupancy.update({
        where: { id: existing.id },
        data: { endDate: new Date() },
      });
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

    return this.toDto(created);
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

  async findActiveScoped(organizationId: string, propertyId: string, occupancyId: string) {
    return prisma.occupancy.findFirst({
      where: {
        id: occupancyId,
        endDate: null,
        deleted: false,
        unit: {
          propertyId,
          deleted: false,
          property: { organizationId, deleted: false },
        },
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
  }

  toDto(o: {
    id: string;
    unitId: string;
    partyId: string;
    role: OccupancyDto["role"];
    startDate: Date;
    party: { displayName: string };
    unit: { code: string; propertyId: string; property: { name: string } };
  }): OccupancyDto {
    return {
      id: o.id,
      unitId: o.unitId,
      unitCode: o.unit.code,
      propertyId: o.unit.propertyId,
      propertyName: o.unit.property.name,
      partyId: o.partyId,
      partyName: o.party.displayName,
      role: o.role,
      startDate: o.startDate,
    };
  }

  async updateRole(input: UpdateOccupancyInput): Promise<OccupancyDto | null> {
    const existing = await this.findActiveScoped(input.organizationId, input.propertyId, input.occupancyId);
    if (!existing) {
      return null;
    }

    const duplicate = await prisma.occupancy.findFirst({
      where: {
        unitId: existing.unitId,
        partyId: existing.partyId,
        role: input.role,
        endDate: null,
        deleted: false,
        id: { not: existing.id },
      },
    });
    if (duplicate) {
      throw new Error("OCCUPANCY_DUPLICATE");
    }

    const updated = await prisma.occupancy.update({
      where: { id: existing.id },
      data: { role: input.role },
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

    return this.toDto(updated);
  }

  async end(input: EndOccupancyInput): Promise<boolean> {
    const existing = await this.findActiveScoped(input.organizationId, input.propertyId, input.occupancyId);
    if (!existing) {
      return false;
    }

    await prisma.occupancy.update({
      where: { id: existing.id },
      data: { endDate: new Date() },
    });
    return true;
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
            property: { select: { name: true, address: true, id: true } },
          },
        },
      },
      orderBy: { startDate: "desc" },
    });

    return occupancies.map((o) => ({
      occupancyId: o.id,
      role: o.role,
      propertyId: o.unit.propertyId,
      unitId: o.unit.id,
      blockId: o.unit.blockId,
      unitCode: o.unit.code,
      propertyName: o.unit.property.name,
      propertyAddress: o.unit.property.address,
      blockName: o.unit.block?.name ?? null,
    }));
  }

  async listForPortalUnit(propertyId: string, unitId: string): Promise<PortalOccupancyDto[]> {
    const unit = await prisma.unit.findFirst({
      where: { id: unitId, propertyId, deleted: false, property: { deleted: false } },
      include: {
        block: { select: { name: true } },
        property: { select: { name: true, address: true, id: true } },
        occupancies: {
          where: activeOccupancy,
          include: { party: { select: { displayName: true } } },
          orderBy: { startDate: "desc" },
          take: 1,
        },
      },
    });
    if (!unit) return [];

    const primary = unit.occupancies[0];
    return [
      {
        occupancyId: primary?.id ?? `unit:${unit.id}`,
        role: primary?.role ?? "OWNER",
        propertyId: unit.propertyId,
        unitId: unit.id,
        blockId: unit.blockId,
        unitCode: unit.code,
        propertyName: unit.property.name,
        propertyAddress: unit.property.address,
        blockName: unit.block?.name ?? null,
      },
    ];
  }
}
