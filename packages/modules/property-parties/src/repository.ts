import { Prisma, prisma } from "@siteyonetim/db";

import type { CreatePartyInput, DeletePartyInput, InvitePortalAccessInput, ListPartiesInput, PartyDto, UpdatePartyInput } from "./contract";

const notDeleted = { deleted: false };
const activeOccupancy = { endDate: null, deleted: false };

export class PartyRepository {
  async listPaginated(input: ListPartiesInput): Promise<{ rows: PartyDto[]; total: number }> {
    const where: Prisma.PartyWhereInput = {
      organizationId: input.organizationId,
      ...notDeleted,
    };

    if (input.propertyId) {
      where.occupancies = {
        some: {
          ...activeOccupancy,
          unit: {
            propertyId: input.propertyId,
            deleted: false,
          },
        },
      };
    }

    const [parties, total] = await Promise.all([
      prisma.party.findMany({
        where,
        orderBy: { displayName: "asc" },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        include: {
          _count: {
            select: {
              occupancies: { where: activeOccupancy },
            },
          },
        },
      }),
      prisma.party.count({ where }),
    ]);

    return {
      rows: parties.map((p) => ({
        id: p.id,
        organizationId: p.organizationId,
        type: p.type,
        displayName: p.displayName,
        email: p.email,
        phone: p.phone,
        communicationConsent: p.communicationConsent,
        hasPortalAccess: Boolean(p.portalUserId),
        activeOccupancyCount: p._count.occupancies,
      })),
      total,
    };
  }

  async create(input: CreatePartyInput): Promise<PartyDto> {
    const created = await prisma.party.create({
      data: {
        organizationId: input.organizationId,
        type: input.type,
        displayName: input.displayName,
        email: input.email?.toLowerCase() ?? null,
        phone: input.phone ?? null,
        communicationConsent: input.communicationConsent ?? false,
      },
      include: {
        _count: {
          select: { occupancies: { where: activeOccupancy } },
        },
      },
    });

    return {
      id: created.id,
      organizationId: created.organizationId,
      type: created.type,
      displayName: created.displayName,
      email: created.email,
      phone: created.phone,
      communicationConsent: created.communicationConsent,
      hasPortalAccess: false,
      activeOccupancyCount: created._count.occupancies,
    };
  }

  async findScoped(partyId: string, organizationId: string) {
    return prisma.party.findFirst({
      where: { id: partyId, organizationId, ...notDeleted },
    });
  }

  async update(input: UpdatePartyInput): Promise<PartyDto | null> {
    const existing = await this.findScoped(input.partyId, input.organizationId);
    if (!existing) {
      return null;
    }

    const email = input.email?.trim().toLowerCase() || null;
    if (existing.portalUserId && email && email !== existing.email?.toLowerCase()) {
      throw new Error("PARTY_EMAIL_LOCKED");
    }

    const updated = await prisma.party.update({
      where: { id: input.partyId },
      data: {
        type: input.type,
        displayName: input.displayName,
        email: existing.portalUserId ? existing.email : email,
        phone: input.phone ?? null,
        communicationConsent: input.communicationConsent ?? false,
      },
      include: {
        _count: {
          select: { occupancies: { where: activeOccupancy } },
        },
      },
    });

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      type: updated.type,
      displayName: updated.displayName,
      email: updated.email,
      phone: updated.phone,
      communicationConsent: updated.communicationConsent,
      hasPortalAccess: Boolean(updated.portalUserId),
      activeOccupancyCount: updated._count.occupancies,
    };
  }

  async softDelete(input: DeletePartyInput): Promise<"ok" | "not_found" | "has_occupancy"> {
    const party = await this.findScoped(input.partyId, input.organizationId);
    if (!party) {
      return "not_found";
    }

    const activeCount = await prisma.occupancy.count({
      where: {
        partyId: party.id,
        ...activeOccupancy,
      },
    });
    if (activeCount > 0) {
      return "has_occupancy";
    }

    await prisma.party.update({
      where: { id: party.id },
      data: {
        deleted: true,
        deletedDate: new Date(),
        deletedUserId: input.actorUserId ?? null,
      },
    });
    return "ok";
  }

  async findAnyByEmail(organizationId: string, email: string) {
    return prisma.party.findFirst({
      where: { organizationId, email: email.toLowerCase() },
    });
  }

  async findAnyByDisplayName(organizationId: string, displayName: string) {
    return prisma.party.findFirst({
      where: { organizationId, displayName: displayName.trim() },
    });
  }

  async listAllForOrganization(organizationId: string): Promise<PartyDto[]> {
    const parties = await prisma.party.findMany({
      where: { organizationId, ...notDeleted },
      orderBy: { displayName: "asc" },
      include: {
        _count: {
          select: { occupancies: { where: activeOccupancy } },
        },
      },
    });

    return parties.map((p) => ({
      id: p.id,
      organizationId: p.organizationId,
      type: p.type,
      displayName: p.displayName,
      email: p.email,
      phone: p.phone,
      communicationConsent: p.communicationConsent,
      hasPortalAccess: Boolean(p.portalUserId),
      activeOccupancyCount: p._count.occupancies,
    }));
  }

  async upsertFromImport(input: UpdatePartyInput, restore: boolean): Promise<PartyDto | null> {
    const party = await prisma.party.findFirst({
      where: { id: input.partyId, organizationId: input.organizationId },
    });
    if (!party) {
      return null;
    }

    const email = input.email?.trim().toLowerCase() || null;
    if (party.portalUserId && email && email !== party.email?.toLowerCase()) {
      throw new Error("PARTY_EMAIL_LOCKED");
    }

    const updated = await prisma.party.update({
      where: { id: party.id },
      data: {
        ...(restore
          ? { deleted: false, deletedDate: null, deletedUserId: null }
          : {}),
        type: input.type,
        displayName: input.displayName,
        email: party.portalUserId ? party.email : email,
        phone: input.phone ?? null,
        communicationConsent: input.communicationConsent ?? false,
      },
      include: {
        _count: {
          select: { occupancies: { where: activeOccupancy } },
        },
      },
    });

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      type: updated.type,
      displayName: updated.displayName,
      email: updated.email,
      phone: updated.phone,
      communicationConsent: updated.communicationConsent,
      hasPortalAccess: Boolean(updated.portalUserId),
      activeOccupancyCount: updated._count.occupancies,
    };
  }

  async linkPortalUser(partyId: string, userId: string, email: string): Promise<PartyDto> {
    const updated = await prisma.party.update({
      where: { id: partyId },
      data: {
        portalUserId: userId,
        email: email.toLowerCase(),
      },
      include: {
        _count: {
          select: { occupancies: { where: activeOccupancy } },
        },
      },
    });

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      type: updated.type,
      displayName: updated.displayName,
      email: updated.email,
      phone: updated.phone,
      communicationConsent: updated.communicationConsent,
      hasPortalAccess: true,
      activeOccupancyCount: updated._count.occupancies,
    };
  }
}

export class PartyUserRepository {
  async findUserByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email: email.toLowerCase(), deleted: false },
      include: { portalParty: true, organizations: { take: 1 } },
    });
  }

  async createPortalUser(name: string, email: string, passwordHash: string) {
    return prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
      },
    });
  }

  async updatePassword(userId: string, passwordHash: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }
}

export class PartyRepositoryTx {
  async invitePortal(input: InvitePortalAccessInput, passwordHash: string): Promise<PartyDto> {
    return prisma.$transaction(async (tx) => {
      const party = await tx.party.findFirst({
        where: { id: input.partyId, organizationId: input.organizationId, deleted: false },
      });
      if (!party) {
        throw new Error("PARTY_NOT_FOUND");
      }

      const email = input.email.trim().toLowerCase();
      let user = await tx.user.findFirst({
        where: { email, deleted: false },
        include: { organizations: { take: 1 } },
      });

      if (user) {
        if (user.organizations.length > 0) {
          throw new Error("EMAIL_USED_BY_ADMIN");
        }
        const existingParty = await tx.party.findFirst({
          where: { portalUserId: user.id, deleted: false, id: { not: party.id } },
        });
        if (existingParty) {
          throw new Error("EMAIL_USED_BY_PORTAL");
        }
        await tx.user.update({
          where: { id: user.id },
          data: { passwordHash, name: input.name.trim() },
        });
      } else {
        user = await tx.user.create({
          data: {
            email,
            name: input.name.trim(),
            passwordHash,
          },
          include: { organizations: { take: 1 } },
        });
      }

      if (!user) {
        throw new Error("PARTY_NOT_FOUND");
      }

      const portalUserId = user.id;

      const updated = await tx.party.update({
        where: { id: party.id },
        data: {
          portalUserId,
          email,
        },
        include: {
          _count: {
            select: { occupancies: { where: activeOccupancy } },
          },
        },
      });

      return {
        id: updated.id,
        organizationId: updated.organizationId,
        type: updated.type,
        displayName: updated.displayName,
        email: updated.email,
        phone: updated.phone,
        communicationConsent: updated.communicationConsent,
        hasPortalAccess: true,
        activeOccupancyCount: updated._count.occupancies,
      };
    });
  }
}
