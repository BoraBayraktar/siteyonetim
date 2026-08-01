import { prisma } from "@siteyonetim/db";

const notDeleted = { deleted: false };

export type AdminUserForReset = {
  id: string;
  email: string;
  name: string;
  organizationId: string;
};

export class PasswordResetRepository {
  async findAdminUserByEmail(email: string): Promise<AdminUserForReset | null> {
    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase(), deleted: false },
      include: {
        organizations: {
          where: { organization: { deleted: false } },
          take: 1,
        },
      },
    });
    const membership = user?.organizations[0];
    if (!user || !membership) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      organizationId: membership.organizationId,
    };
  }

  async invalidateActiveTokens(userId: string, actorUserId?: string | null): Promise<void> {
    await prisma.passwordResetToken.updateMany({
      where: { userId, ...notDeleted, usedAt: null },
      data: {
        deleted: true,
        deletedDate: new Date(),
        deletedUserId: actorUserId ?? null,
      },
    });
  }

  async createToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await prisma.passwordResetToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  }

  async findValidToken(tokenHash: string) {
    return prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        ...notDeleted,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          include: {
            organizations: {
              where: { organization: { deleted: false } },
              take: 1,
            },
          },
        },
      },
    });
  }

  async markTokenUsed(tokenId: string): Promise<void> {
    await prisma.passwordResetToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    });
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }
}
