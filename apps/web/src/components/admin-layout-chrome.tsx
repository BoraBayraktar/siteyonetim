import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { AdminHeader } from "@/components/admin-header";
import { AdminNavProvider } from "@/components/admin-nav-provider";
import { AdminShell } from "@/components/admin-shell";
import type { AdminPropertyNavItem } from "@/lib/admin-property-nav";
import { resolveAdminLandingPath } from "@/lib/admin-landing-path";
import type { AdminNavCapabilities } from "@/lib/admin-nav-capabilities-types";

type Props = {
  locale: string;
  organizationName: string;
  userName: string;
  logoutAction: () => Promise<void>;
  propertiesNav: AdminPropertyNavItem[];
  navCapabilities: AdminNavCapabilities;
  userRole?: string | null;
  children: ReactNode;
};

export async function AdminLayoutChrome({
  locale,
  organizationName,
  userName,
  logoutAction,
  propertiesNav,
  navCapabilities,
  userRole = null,
  children,
}: Props) {
  await getTranslations("nav");
  const adminHomePath = resolveAdminLandingPath(locale, propertiesNav, userRole);

  return (
    <AdminNavProvider>
      <div className="min-h-screen bg-background">
        <AdminHeader
          adminHomePath={adminHomePath}
          organizationName={organizationName}
          userName={userName}
          logoutAction={logoutAction}
          locale={locale}
          navProfile={navCapabilities.navProfile}
          canToggleNavProfile={navCapabilities.canToggleNavProfile}
        />
        <AdminShell
          locale={locale}
          propertiesNav={propertiesNav}
          navCapabilities={navCapabilities}
          userRole={userRole}
        >
          {children}
        </AdminShell>
      </div>
    </AdminNavProvider>
  );
}
