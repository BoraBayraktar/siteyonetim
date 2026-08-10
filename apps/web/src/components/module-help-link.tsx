"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { setNavProfileAction } from "@/app/actions/user-preferences";
import type { AdminNavProfile } from "@/lib/admin-nav-capabilities-types";
import { Button } from "@/components/ui/button";

type Props = {
  locale: string;
  navProfile: AdminNavProfile;
  canToggle: boolean;
};

export function AdminNavProfileToggle({ locale, navProfile, canToggle }: Props) {
  const t = useTranslations("navProfile");
  const [pending, startTransition] = useTransition();

  if (!canToggle) {
    return null;
  }

  const nextProfile: AdminNavProfile = navProfile === "daily" ? "full" : "daily";

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await setNavProfileAction(locale, nextProfile);
        });
      }}
    >
      {navProfile === "daily" ? t("switchToFull") : t("switchToDaily")}
    </Button>
  );
}
