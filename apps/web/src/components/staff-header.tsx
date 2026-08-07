"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import type { AdminPropertyNavItem } from "@/lib/admin-property-nav";
import { staffPortalRootPath } from "@/lib/staff-landing-path";
import { StaffPropertySwitcher } from "@/components/staff-property-switcher";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type Props = {
  locale: string;
  organizationName: string;
  userName: string;
  logoutAction: () => Promise<void>;
  propertiesNav: AdminPropertyNavItem[];
};

export function StaffHeader({
  locale,
  organizationName,
  userName,
  logoutAction,
  propertiesNav,
}: Props) {
  const pathname = usePathname();
  const t = useTranslations("staffPortal");
  const tAuth = useTranslations("auth");

  const propertyMatch = pathname.match(/\/staff\/properties\/([^/]+)/);
  const currentPropertyId = propertyMatch?.[1];

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <div className="min-w-0 flex-1">
          <Link href={staffPortalRootPath(locale)} className="text-sm font-semibold tracking-tight">
            {t("title")}
          </Link>
          <p className="truncate text-xs text-muted-foreground">{organizationName}</p>
          {currentPropertyId ? (
            <StaffPropertySwitcher
              locale={locale}
              propertiesNav={propertiesNav}
              currentPropertyId={currentPropertyId}
            />
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden max-w-[6rem] truncate text-xs text-muted-foreground sm:inline">{userName}</span>
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
