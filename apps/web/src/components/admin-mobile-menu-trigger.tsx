"use client";

import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";

import { useAdminNav } from "@/components/admin-nav-provider";
import { Button } from "@/components/ui/button";

export function AdminMobileMenuTrigger() {
  const { setMobileOpen } = useAdminNav();
  const t = useTranslations("nav");

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="size-9 shrink-0 md:hidden"
      aria-label={t("menuOpen")}
      onClick={() => setMobileOpen(true)}
    >
      <Menu className="size-5" aria-hidden />
    </Button>
  );
}
