import bcrypt from "bcryptjs";
import { OrganizationRole, prisma } from "@siteyonetim/db";

import type { AuthUserDto } from "./contract";
import { isSuperAdminUser } from "./super-admin";

export type UserWithRelations = NonNullable<Awaited<ReturnType<AuthRepository["findByEmail"]>>>;

export function extractOrganizationId(user: UserWithRelations): string | null {
  return user.organizations[0]?.organizationId ?? user.portalParty?.organizationId ?? null;
}

export class AuthRepository {
  async findByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email: email.toLowerCase(), deleted: false },
      include: {
        organizations: {
          where: { organization: { deleted: false } },
          include: { organization: true },
          take: 1,
        },
        portalParty: {
          where: { deleted: false },
          include: { organization: true },
        },
      },
    });
  }

  async findById(userId: string) {
    return prisma.user.findFirst({
      where: { id: userId, deleted: false },
      include: {
        organizations: {
          where: { organization: { deleted: false } },
          include: { organization: true },
          take: 1,
        },
        portalParty: {
          where: { deleted: false },
          include: { organization: true },
        },
      },
    });
  }

  async validateAdminCredentials(input: { email: string; password: string }): Promise<AuthUserDto | null> {
    const user = await this.findByEmail(input.email.trim());
    if (!user) {
      return null;
    }
    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      return null;
    }
    if (isSuperAdminUser(user)) {
      return this.toSuperAdminDto(user);
    }
    const dto = this.toDto(user);
    if (!dto || dto.sessionKind !== "ADMIN") {
      return null;
    }
    return dto;
  }

  toDto(user: UserWithRelations): AuthUserDto | null {
    if (isSuperAdminUser(user)) {
      return null;
    }

    const membership = user.organizations[0];
    if (membership) {
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        sessionKind: "ADMIN",
        organizationId: membership.organizationId,
        organizationName: membership.organization.name,
        role: membership.role,
      };
    }

    const party = user.portalParty;
    if (party && !party.deleted && !party.organization.deleted) {
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        sessionKind: "PORTAL",
        organizationId: party.organizationId,
        organizationName: party.organization.name,
      };
    }

    return null;
  }

  async toSuperAdminDto(user: Pick<UserWithRelations, "id" | "email" | "name">): Promise<AuthUserDto | null> {
    const org = await prisma.organization.findFirst({
      where: { deleted: false },
      orderBy: { createdAt: "asc" },
    });
    if (!org) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      sessionKind: "ADMIN",
      organizationId: org.id,
      organizationName: org.name,
      role: OrganizationRole.ORG_ADMIN,
      isSuperAdmin: true,
    };
  }
}
