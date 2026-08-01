"use client";

import type { ReactNode } from "react";

import { AdminSidebar } from "@/components/admin-sidebar";
import type { AdminPropertyNavItem } from "@/lib/admin-property-nav";

type Props = {
  locale: string;
  propertiesNav: AdminPropertyNavItem[];
  canManageOrgUsers?: boolean;
  children: ReactNode;
};

export function AdminShell({ locale, propertiesNav, canManageOrgUsers = false, children }: Props) {
  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-1 flex-col md:flex-row">
      <AdminSidebar
        locale={locale}
        propertiesNav={propertiesNav}
        canManageOrgUsers={canManageOrgUsers}
      />
      <main className="min-w-0 flex-1 px-4 py-4 md:px-8 md:py-6">{children}</main>
    </div>
  );
}
