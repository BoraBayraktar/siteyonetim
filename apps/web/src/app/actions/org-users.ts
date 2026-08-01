"use server";

import { OrganizationRole } from "@siteyonetim/db";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { canManageOrgUsers } from "@/lib/auth-context";
import { getPropertyRbacService } from "@/lib/services";

export type OrgUserActionState = {
  error?: string;
  success?: boolean;
};

async function requireOrgAdmin() {
  const session = await auth();
  if (!canManageOrgUsers(session) || !session?.user?.organizationId) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

function parsePropertyIds(formData: FormData): string[] {
  return formData
    .getAll("propertyIds")
    .map((value) => String(value))
    .filter(Boolean);
}

function parseRole(value: FormDataEntryValue | null): OrganizationRole {
  return String(value ?? OrganizationRole.PROPERTY_MANAGER) as OrganizationRole;
}

export async function createOrgUserAction(
  _prev: OrgUserActionState,
  formData: FormData,
): Promise<OrgUserActionState> {
  try {
    const session = await requireOrgAdmin();
    const locale = String(formData.get("locale") ?? "tr");

    await getPropertyRbacService().createOrgUser({
      organizationId: session.user.organizationId,
      email: String(formData.get("email") ?? ""),
      name: String(formData.get("name") ?? ""),
      password: String(formData.get("password") ?? ""),
      organizationRole: parseRole(formData.get("organizationRole")),
      propertyIds: parsePropertyIds(formData),
      actorUserId: session.user.id,
    });

    revalidatePath(`/${locale}/admin/users`, "page");
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function updateOrgUserAction(
  _prev: OrgUserActionState,
  formData: FormData,
): Promise<OrgUserActionState> {
  try {
    const session = await requireOrgAdmin();
    const locale = String(formData.get("locale") ?? "tr");
    const password = String(formData.get("password") ?? "").trim();

    await getPropertyRbacService().updateOrgUser({
      organizationId: session.user.organizationId,
      userId: String(formData.get("userId") ?? ""),
      name: String(formData.get("name") ?? ""),
      organizationRole: parseRole(formData.get("organizationRole")),
      propertyIds: parsePropertyIds(formData),
      password: password || null,
      actorUserId: session.user.id,
    });

    revalidatePath(`/${locale}/admin/users`, "page");
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function removeOrgUserAction(
  _prev: OrgUserActionState,
  formData: FormData,
): Promise<OrgUserActionState> {
  try {
    const session = await requireOrgAdmin();
    const locale = String(formData.get("locale") ?? "tr");

    await getPropertyRbacService().removeOrgUser({
      organizationId: session.user.organizationId,
      userId: String(formData.get("userId") ?? ""),
      actorUserId: session.user.id,
    });

    revalidatePath(`/${locale}/admin/users`, "page");
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    throw error;
  }
}
