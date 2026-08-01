import bcrypt from "bcryptjs";
import { prisma } from "@siteyonetim/db";

import type { AuthUserDto } from "./contract";

type UserWithRelations = NonNullable<Awaited<ReturnType<AuthRepository["findByEmail"]>>>;

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
    const dto = this.toDto(user);
    if (!dto || dto.sessionKind !== "ADMIN") {
      return null;
    }
    return dto;
  }

  toDto(user: UserWithRelations): AuthUserDto | null {
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
}
