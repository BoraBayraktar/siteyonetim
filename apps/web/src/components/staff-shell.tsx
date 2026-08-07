"use client";

import Link from "next/link";
import { Gauge, Home, Megaphone, FileText, Wrench } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import {
  staffAnnouncementsPath,
  staffDocumentsPath,
  staffIncidentsPath,
  staffMetersPath,
  staffPropertyPath,
} from "@/lib/staff-landing-path";
import type { StaffPropertyCapabilities } from "@/lib/staff-property-capabilities";
import { cn } from "@/lib/utils";

type Props = {
  locale: string;
  propertyId: string;
  capabilities: StaffPropertyCapabilities;
  children: ReactNode;
};

export function StaffShell({ locale, propertyId, capabilities, children }: Props) {
  const pathname = usePathname();
  const t = useTranslations("staffPortal");

  const nav = [
    {
      href: staffPropertyPath(locale, propertyId),
      label: t("navHome"),
      icon: Home,
      match: (path: string) => path === staffPropertyPath(locale, propertyId),
      visible: true,
    },
    {
      href: staffMetersPath(locale, propertyId),
      label: t("navMeters"),
      icon: Gauge,
      match: (path: string) => path.startsWith(staffMetersPath(locale, propertyId)),
      visible: true,
    },
    {
      href: staffIncidentsPath(locale, propertyId),
      label: t("navIncidents"),
      icon: Wrench,
      match: (path: string) => path.startsWith(staffIncidentsPath(locale, propertyId)),
      visible: capabilities.canManageIncidents,
    },
    {
      href: staffAnnouncementsPath(locale, propertyId),
      label: t("navAnnouncements"),
      icon: Megaphone,
      match: (path: string) => path.startsWith(staffAnnouncementsPath(locale, propertyId)),
      visible: true,
    },
    {
      href: staffDocumentsPath(locale, propertyId),
      label: t("navDocuments"),
      icon: FileText,
      match: (path: string) => path.startsWith(staffDocumentsPath(locale, propertyId)),
      visible: true,
    },
  ].filter((item) => item.visible);

  const navCols = nav.length <= 4 ? "grid-cols-4" : "grid-cols-5";

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4 pb-24">{children}</main>
      <nav
        aria-label={t("navLabel")}
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-card/80"
      >
        <div className={cn("mx-auto grid max-w-lg gap-0.5 px-1 py-2", navCols)}>
          {nav.map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-md px-1 py-1.5 text-[10px] font-medium leading-tight transition-colors sm:text-xs",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                <span className="max-w-full truncate text-center">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
