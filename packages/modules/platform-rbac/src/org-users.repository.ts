import { OrganizationRole, prisma, type PropertyAccessRole } from "@siteyonetim/db";

import type { OrgUserDto, PropertyAccessEntryDto } from "./contract";
import { portalKindForOrganizationRole } from "./contract";

const notDeleted = { deleted: false };

const assignableRoles: OrganizationRole[] = [
  OrganizationRole.ORG_ADMIN,
  OrganizationRole.PROPERTY_MANAGER,
  OrganizationRole.ACCOUNTANT,
  OrganizationRole.AUDITOR,
  OrganizationRole.BOARD_MEMBER,
  OrganizationRole.STAFF,
];

export class OrgUsersRepository {
  async listOrgUsers(organizationId: string): Promise<OrgUserDto[]> {
    const memberships = await prisma.userOrganization.findMany({
      where: {
        organizationId,
        user: { ...notDeleted, isSuperAdmin: false },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { user: { name: "asc" } },
    });

    const propertyAccess = await prisma.userPropertyAccess.findMany({
      where: {
        organizationId,
        ...notDeleted,
        userId: { in: memberships.map((m) => m.userId) },
        property: notDeleted,
      },
      include: {
        property: { select: { name: true } },
      },
      orderBy: { property: { name: "asc" } },
    });

    const accessByUser = new Map<string, PropertyAccessEntryDto[]>();
    for (const row of propertyAccess) {
      const list = accessByUser.get(row.userId) ?? [];
      list.push({
        propertyId: row.propertyId,
        propertyName: row.property.name,
        role: row.role,
      });
      accessByUser.set(row.userId, list);
    }

    return memberships.map((membership) => ({
      userId: membership.userId,
      email: membership.user.email,
      name: membership.user.name,
      organizationRole: membership.role,
      portalKind: portalKindForOrganizationRole(membership.role),
      propertyAccess: accessByUser.get(membership.userId) ?? [],
    }));
  }

  async findMembership(organizationId: string, userId: string) {
    return prisma.userOrganization.findFirst({
      where: { organizationId, userId },
      include: {
        user: {
          select: { id: true, email: true, name: true, deleted: true, isSuperAdmin: true },
        },
      },
    });
  }

  async findUserByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email: email.toLowerCase(), deleted: false },
    });
  }

  async findUserOrgMembership(userId: string, organizationId: string) {
    return prisma.userOrganization.findFirst({
      where: { userId, organizationId },
    });
  }

  async createUser(data: { email: string; name: string; passwordHash: string }) {
    return prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        name: data.name.trim(),
        passwordHash: data.passwordHash,
      },
    });
  }

  async upsertMembership(userId: string, organizationId: string, role: OrganizationRole) {
    return prisma.userOrganization.upsert({
      where: {
        userId_organizationId: { userId, organizationId },
      },
      create: { userId, organizationId, role },
      update: { role },
    });
  }

  async updateUserName(userId: string, name: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { name: name.trim() },
    });
  }

  async updateUserPassword(userId: string, passwordHash: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async removeMembership(organizationId: string, userId: string) {
    const membership = await prisma.userOrganization.findFirst({
      where: { userId, organizationId },
    });
    if (!membership) return false;

    await prisma.userOrganization.delete({
      where: { id: membership.id },
    });
    return true;
  }

  async clearPropertyAccess(organizationId: string, userId: string, actorUserId: string) {
    await prisma.userPropertyAccess.updateMany({
      where: { organizationId, userId, ...notDeleted },
      data: {
        deleted: true,
        deletedDate: new Date(),
        deletedUserId: actorUserId,
      },
    });
  }

  async listPropertyOptions(organizationId: string) {
    return prisma.property.findMany({
      where: { organizationId, ...notDeleted },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  isAssignableRole(role: OrganizationRole): boolean {
    return assignableRoles.includes(role);
  }

  propertyRoleForOrganizationRole(role: OrganizationRole): PropertyAccessRole {
    switch (role) {
      case OrganizationRole.ORG_ADMIN:
        return "PROPERTY_ADMIN";
      case OrganizationRole.PROPERTY_MANAGER:
        return "PROPERTY_MANAGER";
      case OrganizationRole.ACCOUNTANT:
        return "PROPERTY_ACCOUNTANT";
      case OrganizationRole.AUDITOR:
        return "PROPERTY_AUDITOR";
      case OrganizationRole.BOARD_MEMBER:
        return "PROPERTY_BOARD_MEMBER";
      case OrganizationRole.STAFF:
        return "PROPERTY_STAFF";
      default:
        return "PROPERTY_STAFF";
    }
  }
}
