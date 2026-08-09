import type { AdminNavProfile } from "@siteyonetim/db";
import { createAuditService } from "@siteyonetim/platform-audit";

import type {
  AdminOnboardingStateDto,
  UserPreferenceContext,
  UserPreferenceServiceContract,
  UserUiPreferenceDto,
} from "./user-preference.contract";
import { UserPreferenceRepository } from "./user-preference.repository";

export class UserPreferenceService implements UserPreferenceServiceContract {
  constructor(
    private readonly repository = new UserPreferenceRepository(),
    private readonly audit = createAuditService(),
  ) {}

  async getPreference(ctx: UserPreferenceContext): Promise<UserUiPreferenceDto | null> {
    const row = await this.repository.findByUserAndOrg(ctx.userId, ctx.organizationId);
    return row ? this.repository.toDto(row) : null;
  }

  async getAdminOnboardingState(ctx: UserPreferenceContext): Promise<AdminOnboardingStateDto> {
    const row = await this.repository.findByUserAndOrg(ctx.userId, ctx.organizationId);
    if (!row) {
      return { completed: false, currentStep: 0, dismissedHints: {} };
    }
    const dto = this.repository.toDto(row);
    return {
      completed: dto.adminOnboardingCompletedAt != null,
      currentStep: dto.adminOnboardingStep ?? 0,
      dismissedHints: dto.dismissedHints,
    };
  }

  async completeAdminOnboarding(ctx: UserPreferenceContext): Promise<AdminOnboardingStateDto> {
    const row = await this.repository.completeOnboarding(ctx.userId, ctx.organizationId);
    await this.audit.record({
      organizationId: ctx.organizationId,
      userId: ctx.actorUserId,
      action: "auth.onboardingCompleted",
      entityType: "UserUiPreference",
      entityId: row.id,
    });
    return this.getAdminOnboardingState(ctx);
  }

  async dismissAdminOnboarding(ctx: UserPreferenceContext): Promise<AdminOnboardingStateDto> {
    const row = await this.repository.dismissOnboarding(ctx.userId, ctx.organizationId);
    await this.audit.record({
      organizationId: ctx.organizationId,
      userId: ctx.actorUserId,
      action: "auth.onboardingDismissed",
      entityType: "UserUiPreference",
      entityId: row.id,
    });
    return this.getAdminOnboardingState(ctx);
  }

  async setAdminOnboardingStep(ctx: UserPreferenceContext, step: number): Promise<AdminOnboardingStateDto> {
    await this.repository.setOnboardingStep(ctx.userId, ctx.organizationId, step);
    return this.getAdminOnboardingState(ctx);
  }

  async setNavProfile(ctx: UserPreferenceContext, profile: AdminNavProfile): Promise<UserUiPreferenceDto> {
    const row = await this.repository.setNavProfile(ctx.userId, ctx.organizationId, profile);
    await this.audit.record({
      organizationId: ctx.organizationId,
      userId: ctx.actorUserId,
      action: "auth.navProfileChanged",
      entityType: "UserUiPreference",
      entityId: row.id,
      metadata: { navProfile: profile },
    });
    return this.repository.toDto(row);
  }

  async dismissHint(ctx: UserPreferenceContext, hintKey: string): Promise<UserUiPreferenceDto> {
    const row = await this.repository.dismissHint(ctx.userId, ctx.organizationId, hintKey);
    return this.repository.toDto(row);
  }
}

export function createUserPreferenceService() {
  return new UserPreferenceService();
}
