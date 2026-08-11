"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { AdminMobileMenuTrigger } from "@/components/admin-mobile-menu-trigger";

type Props = {
  adminHomePath: string;
  organizationName: string;
};

export function AdminHeader({ adminHomePath, organizationName }: Props) {
  const t = useTranslations("nav");

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:hidden">
      <div className="flex h-14 items-center gap-3 px-4">
        <AdminMobileMenuTrigger />
        <div className="min-w-0">
          <Link href={adminHomePath} className="text-sm font-semibold tracking-tight">
            {t("admin")}
          </Link>
          <p className="truncate text-xs text-muted-foreground">{organizationName}</p>
        </div>
      </div>
    </header>
  );
}
