"use client";

import Link from "next/link";
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

export function ModuleHelpLink({
  locale,
  moduleKey,
  className,
}: {
  locale: string;
  moduleKey: "dues" | "register" | "dashboard" | "accrual" | "reports";
  className?: string;
}) {
  const t = useTranslations("helpLinks");
  const anchor = t(`${moduleKey}.anchor`);
  const href = `/${locale}/admin/help/glossary${anchor ? `#${anchor}` : ""}`;

  return (
    <Button variant="ghost" size="sm" className={className} asChild>
      <Link href={href}>{t(`${moduleKey}.label`)}</Link>
    </Button>
  );
}
