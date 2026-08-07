"use server";

import { auth } from "@/auth";
import { resolveAdminLandingPath } from "@/lib/admin-landing-path";
import { getPropertyService } from "@/lib/services";

async function loadPropertiesNav(organizationId: string) {
  const page = await getPropertyService().list({
    organizationId,
    page: 1,
    pageSize: 2,
  });

  return page.items.map((p) => ({ id: p.id, name: p.name }));
}

export async function getAdminLandingPathForOrganization(
  locale: string,
  organizationId: string,
  role?: string | null,
): Promise<string> {
  const propertiesNav = await loadPropertiesNav(organizationId);
  return resolveAdminLandingPath(locale, propertiesNav, role);
}

export async function resolveAdminLandingPathAction(locale: string): Promise<string> {
  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    return `/${locale}/admin/properties`;
  }

  return getAdminLandingPathForOrganization(locale, session.user.organizationId, session.user.role);
}
