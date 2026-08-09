import type { AdminNavProfile } from "@siteyonetim/db";

export type UserPreferenceContext = {
  userId: string;
  organizationId: string;
  actorUserId?: string | null;
};

export type AdminOnboardingStateDto = {
  completed: boolean;
  currentStep: number;
  dismissedHints: Record<string, boolean>;
};

export type UserUiPreferenceDto = {
  userId: string;
  organizationId: string;
  adminOnboardingCompletedAt: Date | null;
  adminOnboardingStep: number | null;
  navProfile: AdminNavProfile | null;
  dismissedHints: Record<string, boolean>;
};

export interface UserPreferenceServiceContract {
  getPreference(ctx: UserPreferenceContext): Promise<UserUiPreferenceDto | null>;
  getAdminOnboardingState(ctx: UserPreferenceContext): Promise<AdminOnboardingStateDto>;
  completeAdminOnboarding(ctx: UserPreferenceContext): Promise<AdminOnboardingStateDto>;
  dismissAdminOnboarding(ctx: UserPreferenceContext): Promise<AdminOnboardingStateDto>;
  setAdminOnboardingStep(ctx: UserPreferenceContext, step: number): Promise<AdminOnboardingStateDto>;
  setNavProfile(ctx: UserPreferenceContext, profile: AdminNavProfile): Promise<UserUiPreferenceDto>;
  dismissHint(ctx: UserPreferenceContext, hintKey: string): Promise<UserUiPreferenceDto>;
}
