import { OrganizationRole, prisma, type PropertyAccessRole } from "@siteyonetim/db";

import type { PropertyAccessEntryDto, ResolvePropertyAccessInput } from "./contract";

const notDeleted = { deleted: false };

function isOrgWideRole(role: OrganizationRole | null | undefined): boolean {
  return role === OrganizationRole.ORG_ADMIN;
}

export class PropertyRbacRepository {
  async isSuperAdminUser(userId: string): Promise<boolean> {
    const user = await prisma.user.findFirst({
      where: { id: userId, deleted: false },
      select: { isSuperAdmin: true },
    });
    return user?.isSuperAdmin === true;
  }

  async propertyExists(propertyId: string): Promise<boolean> {
    const count = await prisma.property.count({
      where: { id: propertyId, ...notDeleted, organization: { deleted: false } },
    });
    return count > 0;
  }

  async listPropertyAccessForUser(input: ResolvePropertyAccessInput): Promise<PropertyAccessEntryDto[]> {
    const rows = await prisma.userPropertyAccess.findMany({
      where: {
        userId: input.userId,
        organizationId: input.organizationId,
        ...notDeleted,
        property: notDeleted,
      },
      include: {
        property: { select: { name: true } },
      },
      orderBy: { property: { name: "asc" } },
    });

    return rows.map((row) => ({
      propertyId: row.propertyId,
      propertyName: row.property.name,
      role: row.role,
    }));
  }

  async listAllPropertyIds(organizationId: string): Promise<string[]> {
    const rows = await prisma.property.findMany({
      where: { organizationId, ...notDeleted },
      select: { id: true },
      orderBy: { name: "asc" },
    });
    return rows.map((r) => r.id);
  }

  async findPropertyAccess(
    userId: string,
    organizationId: string,
    propertyId: string,
  ): Promise<PropertyAccessRole | null> {
    const row = await prisma.userPropertyAccess.findFirst({
      where: {
        userId,
        organizationId,
        propertyId,
        ...notDeleted,
      },
      select: { role: true },
    });
    return row?.role ?? null;
  }

  async propertyBelongsToOrg(organizationId: string, propertyId: string): Promise<boolean> {
    const count = await prisma.property.count({
      where: { id: propertyId, organizationId, ...notDeleted },
    });
    return count > 0;
  }

  async findPropertyName(organizationId: string, propertyId: string): Promise<string | null> {
    const row = await prisma.property.findFirst({
      where: { id: propertyId, organizationId, ...notDeleted },
      select: { name: true },
    });
    return row?.name ?? null;
  }

  async upsertPropertyAccess(data: {
    userId: string;
    organizationId: string;
    propertyId: string;
    role: PropertyAccessRole;
  }): Promise<void> {
    await prisma.userPropertyAccess.upsert({
      where: {
        userId_propertyId: {
          userId: data.userId,
          propertyId: data.propertyId,
        },
      },
      create: {
        userId: data.userId,
        organizationId: data.organizationId,
        propertyId: data.propertyId,
        role: data.role,
      },
      update: {
        role: data.role,
        organizationId: data.organizationId,
        deleted: false,
        deletedDate: null,
        deletedUserId: null,
      },
    });
  }

  async softDeletePropertyAccess(
    userId: string,
    organizationId: string,
    propertyId: string,
    actorUserId: string,
  ): Promise<void> {
    const existing = await prisma.userPropertyAccess.findFirst({
      where: { userId, organizationId, propertyId, ...notDeleted },
    });
    if (!existing) return;

    await prisma.userPropertyAccess.update({
      where: { id: existing.id },
      data: {
        deleted: true,
        deletedDate: new Date(),
        deletedUserId: actorUserId,
      },
    });
  }

  async replacePropertyAccessSet(data: {
    userId: string;
    organizationId: string;
    propertyIds: string[];
    role: PropertyAccessRole;
    actorUserId: string;
  }): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.userPropertyAccess.findMany({
        where: { userId: data.userId, organizationId: data.organizationId, ...notDeleted },
      });

      const desired = new Set(data.propertyIds);
      for (const row of existing) {
        if (!desired.has(row.propertyId)) {
          await tx.userPropertyAccess.update({
            where: { id: row.id },
            data: {
              deleted: true,
              deletedDate: new Date(),
              deletedUserId: data.actorUserId,
            },
          });
        }
      }

      for (const propertyId of data.propertyIds) {
        await tx.userPropertyAccess.upsert({
          where: {
            userId_propertyId: { userId: data.userId, propertyId },
          },
          create: {
            userId: data.userId,
            organizationId: data.organizationId,
            propertyId,
            role: data.role,
          },
          update: {
            role: data.role,
            organizationId: data.organizationId,
            deleted: false,
            deletedDate: null,
            deletedUserId: null,
          },
        });
      }
    });
  }
}
