"use client";

import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";

import { useAdminNav } from "@/components/admin-nav-provider";
import { AdminNavProfileToggle } from "@/components/module-help-link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { AdminNavProfile } from "@/lib/admin-nav-capabilities-types";
import { cn } from "@/lib/utils";

type Props = {
  locale: string;
  organizationName: string;
  userName: string;
  logoutAction: () => Promise<void>;
  navProfile: AdminNavProfile;
  canToggleNavProfile: boolean;
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function AdminSidebarFooter({
  locale,
  organizationName,
  userName,
  logoutAction,
  navProfile,
  canToggleNavProfile,
}: Props) {
  const tAuth = useTranslations("auth");
  const { collapsed } = useAdminNav();

  const logoutButton = (
    <form action={logoutAction}>
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
        aria-label={tAuth("logout")}
      >
        <LogOut className="size-4" aria-hidden />
      </Button>
    </form>
  );

  return (
    <div className={cn("space-y-2 border-t px-3 py-3", collapsed && "px-2")}>
      {canToggleNavProfile && !collapsed ? (
        <AdminNavProfileToggle locale={locale} navProfile={navProfile} canToggle={canToggleNavProfile} />
      ) : null}

      <Separator />

      <div className={cn("flex items-center gap-2", collapsed && "flex-col")}>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
          {initialsFromName(userName)}
        </span>
        {collapsed ? null : (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{userName}</span>
            <span className="block truncate text-xs text-muted-foreground">{organizationName}</span>
          </span>
        )}
        {collapsed ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>{logoutButton}</TooltipTrigger>
              <TooltipContent side="right">{tAuth("logout")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          logoutButton
        )}
      </div>
    </div>
  );
}
