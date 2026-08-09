import { AdminNavProfile, prisma } from "@siteyonetim/db";

const notDeleted = { deleted: false };

function parseDismissedHints(raw: unknown): Record<string, boolean> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).filter(([, value]) => typeof value === "boolean"),
  ) as Record<string, boolean>;
}

export class UserPreferenceRepository {
  async findByUserAndOrg(userId: string, organizationId: string) {
    return prisma.userUiPreference.findFirst({
      where: { userId, organizationId, ...notDeleted },
    });
  }

  async upsert(userId: string, organizationId: string) {
    return prisma.userUiPreference.upsert({
      where: {
        userId_organizationId: { userId, organizationId },
      },
      create: { userId, organizationId },
      update: {},
    });
  }

  async completeOnboarding(userId: string, organizationId: string) {
    const row = await this.upsert(userId, organizationId);
    return prisma.userUiPreference.update({
      where: { id: row.id },
      data: {
        adminOnboardingCompletedAt: new Date(),
        adminOnboardingStep: null,
      },
    });
  }

  async dismissOnboarding(userId: string, organizationId: string) {
    const row = await this.upsert(userId, organizationId);
    return prisma.userUiPreference.update({
      where: { id: row.id },
      data: {
        adminOnboardingCompletedAt: new Date(),
        adminOnboardingStep: null,
      },
    });
  }

  async setOnboardingStep(userId: string, organizationId: string, step: number) {
    const row = await this.upsert(userId, organizationId);
    return prisma.userUiPreference.update({
      where: { id: row.id },
      data: { adminOnboardingStep: step },
    });
  }

  async setNavProfile(userId: string, organizationId: string, navProfile: AdminNavProfile) {
    const row = await this.upsert(userId, organizationId);
    return prisma.userUiPreference.update({
      where: { id: row.id },
      data: { navProfile },
    });
  }

  async dismissHint(userId: string, organizationId: string, hintKey: string) {
    const row = await this.upsert(userId, organizationId);
    const hints = parseDismissedHints(row.dismissedHints);
    hints[hintKey] = true;
    return prisma.userUiPreference.update({
      where: { id: row.id },
      data: { dismissedHints: hints },
    });
  }

  toDto(row: {
    userId: string;
    organizationId: string;
    adminOnboardingCompletedAt: Date | null;
    adminOnboardingStep: number | null;
    navProfile: AdminNavProfile | null;
    dismissedHints: unknown;
  }) {
    return {
      userId: row.userId,
      organizationId: row.organizationId,
      adminOnboardingCompletedAt: row.adminOnboardingCompletedAt,
      adminOnboardingStep: row.adminOnboardingStep,
      navProfile: row.navProfile,
      dismissedHints: parseDismissedHints(row.dismissedHints),
    };
  }
}
