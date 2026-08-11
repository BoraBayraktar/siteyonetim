"use client";

import { Building2, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { useAdminNav } from "@/components/admin-nav-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  adminHomePath: string;
  organizationName: string;
};

export function AdminSidebarBrand({ adminHomePath, organizationName }: Props) {
  const t = useTranslations("nav");
  const { collapsed, setCollapsed } = useAdminNav();

  return (
    <div className={cn("px-3 pt-3 pb-2", collapsed && "px-2")}>
      <div className={cn("flex items-center gap-2", collapsed ? "flex-col" : "justify-between")}>
        <Link href={adminHomePath} className="flex min-w-0 items-center gap-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="size-5" aria-hidden />
          </span>
          {collapsed ? null : (
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold tracking-tight">{t("admin")}</span>
              <span className="block truncate text-xs text-muted-foreground">{organizationName}</span>
            </span>
          )}
        </Link>
        <div className={cn("flex items-center gap-1", collapsed && "flex-col")}>
          <ThemeToggle />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden size-8 shrink-0 md:inline-flex"
            aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" aria-hidden />
            ) : (
              <PanelLeftClose className="size-4" aria-hidden />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
