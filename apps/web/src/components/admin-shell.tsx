"use client";

import type { ReactNode } from "react";

import { AdminSidebar } from "@/components/admin-sidebar";
import type { AdminPropertyNavItem } from "@/lib/admin-property-nav";
import type { AdminNavCapabilities, AdminNavProfile } from "@/lib/admin-nav-capabilities-types";

type Props = {
  locale: string;
  adminHomePath: string;
  organizationName: string;
  userName: string;
  logoutAction: () => Promise<void>;
  navProfile: AdminNavProfile;
  canToggleNavProfile: boolean;
  propertiesNav: AdminPropertyNavItem[];
  navCapabilities: AdminNavCapabilities;
  children: ReactNode;
};

export function AdminShell({
  locale,
  adminHomePath,
  organizationName,
  userName,
  logoutAction,
  navProfile,
  canToggleNavProfile,
  propertiesNav,
  navCapabilities,
  children,
}: Props) {
  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-1 flex-col md:min-h-screen md:flex-row">
      <AdminSidebar
        locale={locale}
        adminHomePath={adminHomePath}
        organizationName={organizationName}
        userName={userName}
        logoutAction={logoutAction}
        navProfile={navProfile}
        canToggleNavProfile={canToggleNavProfile}
        propertiesNav={propertiesNav}
        navCapabilities={navCapabilities}
      />
      <main className="min-w-0 flex-1 px-4 py-4 md:px-8 md:py-6">{children}</main>
    </div>
  );
}
