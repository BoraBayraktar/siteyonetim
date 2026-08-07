import { auth } from "@/auth";
import { assertAdminPropertyAccess, resolveAdminOrganizationId } from "@/lib/auth-context";

export type AdminActionContext = {
  organizationId: string;
  propertyId: string;
  actorUserId: string;
};

export async function adminPropertyActionContext(propertyId: string): Promise<AdminActionContext | null> {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    return null;
  }

  try {
    await assertAdminPropertyAccess(session, propertyId);
  } catch {
    return null;
  }

  const organizationId = await resolveAdminOrganizationId(session, propertyId);
  if (!organizationId) {
    return null;
  }

  return {
    organizationId,
    propertyId,
    actorUserId: session.user.id,
  };
}
