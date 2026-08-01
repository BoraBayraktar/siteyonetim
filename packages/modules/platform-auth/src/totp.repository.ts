import { randomBytes } from "node:crypto";

import { prisma, Prisma } from "@siteyonetim/db";

export type UserTotpRow = {
  id: string;
  email: string;
  name: string;
  totpSecretEnc: string | null;
  totpEnabledAt: Date | null;
  totpBackupCodes: unknown;
};

export class TotpRepository {
  async findAdminUserByEmail(email: string): Promise<UserTotpRow | null> {
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        deleted: false,
        organizations: { some: { organization: { deleted: false } } },
      },
      select: {
        id: true,
        email: true,
        name: true,
        totpSecretEnc: true,
        totpEnabledAt: true,
        totpBackupCodes: true,
      },
    });
    return user;
  }

  async findAdminUserById(userId: string): Promise<UserTotpRow | null> {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        deleted: false,
        organizations: { some: { organization: { deleted: false } } },
      },
      select: {
        id: true,
        email: true,
        name: true,
        totpSecretEnc: true,
        totpEnabledAt: true,
        totpBackupCodes: true,
      },
    });
    return user;
  }

  async getOrganizationRequireTwoFactor(organizationId: string): Promise<boolean> {
    const org = await prisma.organization.findFirst({
      where: { id: organizationId, deleted: false },
      select: { requireTwoFactor: true },
    });
    return org?.requireTwoFactor ?? false;
  }

  async setOrganizationRequireTwoFactor(organizationId: string, requireTwoFactor: boolean): Promise<void> {
    await prisma.organization.update({
      where: { id: organizationId },
      data: { requireTwoFactor },
    });
  }

  async enableTotp(userId: string, secretEnc: string, backupCodeHashes: string[]): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        totpSecretEnc: secretEnc,
        totpEnabledAt: new Date(),
        totpBackupCodes: backupCodeHashes,
      },
    });
  }

  async disableTotp(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        totpSecretEnc: null,
        totpEnabledAt: null,
        totpBackupCodes: Prisma.JsonNull,
      },
    });
  }

  async updateBackupCodes(userId: string, backupCodeHashes: string[]): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { totpBackupCodes: backupCodeHashes },
    });
  }

  generateBackupCodes(count = 8): string[] {
    return Array.from({ length: count }, () => randomBytes(4).toString("hex").toUpperCase());
  }

  readBackupCodeHashes(raw: unknown): string[] {
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.filter((item): item is string => typeof item === "string");
  }
}
