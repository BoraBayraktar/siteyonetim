import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { AdminHeader } from "@/components/admin-header";
import { AdminNavProvider } from "@/components/admin-nav-provider";
import { AdminShell } from "@/components/admin-shell";
import type { AdminPropertyNavItem } from "@/lib/admin-property-nav";
import { resolveAdminLandingPath } from "@/lib/admin-landing-path";

type Props = {
  locale: string;
  organizationName: string;
  userName: string;
  logoutAction: () => Promise<void>;
  propertiesNav: AdminPropertyNavItem[];
  canManageOrgUsers?: boolean;
  children: ReactNode;
};

export async function AdminLayoutChrome({
  locale,
  organizationName,
  userName,
  logoutAction,
  propertiesNav,
  canManageOrgUsers = false,
  children,
}: Props) {
  await getTranslations("nav");
  const adminHomePath = resolveAdminLandingPath(locale, propertiesNav);

  return (
    <AdminNavProvider>
      <div className="min-h-screen bg-background">
        <AdminHeader
          adminHomePath={adminHomePath}
          organizationName={organizationName}
          userName={userName}
          logoutAction={logoutAction}
        />
        <AdminShell
          locale={locale}
          propertiesNav={propertiesNav}
          canManageOrgUsers={canManageOrgUsers}
        >
          {children}
        </AdminShell>
      </div>
    </AdminNavProvider>
  );
}
