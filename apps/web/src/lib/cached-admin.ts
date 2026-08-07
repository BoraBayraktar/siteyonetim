import { cache } from "react";

import { auth } from "@/auth";
import { resolveAccessiblePropertyIds, isSuperAdminSession } from "@/lib/auth-context";
import type { AdminPropertyNavItem } from "@/lib/admin-property-nav";
import { getPropertyService } from "@/lib/services";

export const getAdminSession = cache(async () => auth());

export const listAdminPropertiesNav = cache(async (organizationId: string): Promise<AdminPropertyNavItem[]> => {
  const session = await auth();
  if (isSuperAdminSession(session)) {
    return getPropertyService().listNavItemsGlobal();
  }

  const scope = await resolveAccessiblePropertyIds(session);

  const data = await getPropertyService().list({
    organizationId,
    page: 1,
    pageSize: 200,
    ...(scope && scope !== "ALL" ? { propertyIds: scope } : {}),
  });

  return data.items.map((property) => ({ id: property.id, name: property.name }));
});
