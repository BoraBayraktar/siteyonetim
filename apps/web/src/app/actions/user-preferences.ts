"use server";

import { revalidatePath } from "next/cache";

import { getAdminSession } from "@/lib/cached-admin";
import { adminNavProfileToDb } from "@/lib/admin-nav-capabilities-types";
import type { AdminNavProfile } from "@/lib/admin-nav-capabilities-types";
import { getUserPreferenceService } from "@/lib/services";

function preferenceCtx(session: NonNullable<Awaited<ReturnType<typeof getAdminSession>>>) {
  return {
    userId: session.user.id,
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
  };
}

function revalidateAdminShell(locale: string) {
  revalidatePath(`/${locale}/admin`, "layout");
}

export async function completeAdminOnboardingAction(locale: string) {
  const session = await getAdminSession();
  if (!session?.user) return;
  await getUserPreferenceService().completeAdminOnboarding(preferenceCtx(session));
  revalidateAdminShell(locale);
}

export async function dismissAdminOnboardingAction(locale: string) {
  const session = await getAdminSession();
  if (!session?.user) return;
  await getUserPreferenceService().dismissAdminOnboarding(preferenceCtx(session));
  revalidateAdminShell(locale);
}

export async function setAdminOnboardingStepAction(locale: string, step: number) {
  const session = await getAdminSession();
  if (!session?.user) return;
  await getUserPreferenceService().setAdminOnboardingStep(preferenceCtx(session), step);
  revalidateAdminShell(locale);
}

export async function setNavProfileAction(locale: string, profile: AdminNavProfile) {
  const session = await getAdminSession();
  if (!session?.user) return;
  await getUserPreferenceService().setNavProfile(preferenceCtx(session), adminNavProfileToDb(profile));
  revalidateAdminShell(locale);
}
