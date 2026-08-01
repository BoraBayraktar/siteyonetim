"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { AdminMobileMenuTrigger } from "@/components/admin-mobile-menu-trigger";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type Props = {
  adminHomePath: string;
  organizationName: string;
  userName: string;
  logoutAction: () => Promise<void>;
};

export function AdminHeader({ adminHomePath, organizationName, userName, logoutAction }: Props) {
  const t = useTranslations("nav");
  const tAuth = useTranslations("auth");

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex h-14 items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <AdminMobileMenuTrigger />
          <div className="min-w-0">
            <Link href={adminHomePath} className="text-sm font-semibold tracking-tight">
              {t("admin")}
            </Link>
            <p className="truncate text-xs text-muted-foreground">{organizationName}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden max-w-[8rem] truncate text-xs text-muted-foreground sm:inline">{userName}</span>
          <Separator orientation="vertical" className="hidden h-6 sm:block" />
          <form action={logoutAction}>
            <Button variant="outline" size="sm" type="submit">
              {tAuth("logout")}
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
