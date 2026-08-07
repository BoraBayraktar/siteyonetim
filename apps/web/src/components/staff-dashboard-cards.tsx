"use client";

import Link from "next/link";
import { Gauge, Megaphone, FileText, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  staffAnnouncementsPath,
  staffDocumentsPath,
  staffIncidentsPath,
  staffMetersPath,
} from "@/lib/staff-landing-path";
import type { StaffPropertyCapabilities } from "@/lib/staff-property-capabilities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  locale: string;
  propertyId: string;
  propertyName: string;
  capabilities: StaffPropertyCapabilities;
  openIncidentsCount?: number;
};

export function StaffDashboardCards({
  locale,
  propertyId,
  propertyName,
  capabilities,
  openIncidentsCount = 0,
}: Props) {
  const t = useTranslations("staffPortal");

  const cards = [
    {
      href: staffMetersPath(locale, propertyId),
      title: t("cardMetersTitle"),
      description: t("cardMetersDescription"),
      icon: Gauge,
      primary: true,
      visible: true,
    },
    {
      href: staffIncidentsPath(locale, propertyId),
      title: t("cardIncidentsTitle"),
      description: t("cardIncidentsDescription"),
      icon: Wrench,
      badge: openIncidentsCount > 0 ? openIncidentsCount : undefined,
      visible: capabilities.canManageIncidents,
    },
    {
      href: staffAnnouncementsPath(locale, propertyId),
      title: t("cardAnnouncementsTitle"),
      description: t("cardAnnouncementsDescription"),
      icon: Megaphone,
      visible: true,
    },
    {
      href: staffDocumentsPath(locale, propertyId),
      title: t("cardDocumentsTitle"),
      description: t("cardDocumentsDescription"),
      icon: FileText,
      visible: true,
    },
  ].filter((card) => card.visible);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("homeTitle")}</h1>
        <p className="text-sm text-muted-foreground">{propertyName}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("homeSubtitle")}</p>
      </div>
      <div className="grid gap-3">
        {cards.map(({ href, title, description, icon: Icon, primary, badge }) => (
          <Card key={href} className={primary ? "border-primary/30 bg-primary/5" : undefined}>
            <CardHeader className="pb-2">
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-background p-2 shadow-sm">
                  <Icon className="size-5 text-primary" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">{title}</CardTitle>
                    {badge ? <Badge variant="secondary">{badge}</Badge> : null}
                  </div>
                  <CardDescription>{description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" variant={primary ? "default" : "outline"} size="lg">
                <Link href={href}>{t("open")}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
