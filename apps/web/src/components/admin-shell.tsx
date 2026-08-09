"use client";

import type { ReactNode } from "react";

import { AdminSidebar } from "@/components/admin-sidebar";
import { PropertyUiModeProvider } from "@/components/property-ui-mode-context";
import type { AdminPropertyNavItem } from "@/lib/admin-property-nav";
import type { AdminNavCapabilities } from "@/lib/admin-nav-capabilities-types";

type Props = {
  locale: string;
  propertiesNav: AdminPropertyNavItem[];
  navCapabilities: AdminNavCapabilities;
  userRole?: string | null;
  children: ReactNode;
};

export function AdminShell({
  locale,
  propertiesNav,
  navCapabilities,
  userRole = null,
  children,
}: Props) {
  return (
    <PropertyUiModeProvider>
      <div className="flex min-h-[calc(100dvh-3.5rem)] flex-1 flex-col md:flex-row">
        <AdminSidebar
          locale={locale}
          propertiesNav={propertiesNav}
          navCapabilities={navCapabilities}
          userRole={userRole}
        />
        <main className="min-w-0 flex-1 px-4 py-4 md:px-8 md:py-6">{children}</main>
      </div>
    </PropertyUiModeProvider>
  );
}
