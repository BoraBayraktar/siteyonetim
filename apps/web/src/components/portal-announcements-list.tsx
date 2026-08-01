"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";

import { markAnnouncementReadAction } from "@/app/actions/announcements";
import { AnnouncementBodyContent } from "@/components/announcement-body-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AnnouncementDto } from "@siteyonetim/comm-announcements";

type Props = {
  locale: string;
  items: AnnouncementDto[];
};

export function PortalAnnouncementsList({ locale, items }: Props) {
  const t = useTranslations("portal");
  const [pending, startTransition] = useTransition();

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("announcementsEmpty")}</p>;
  }

  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.id} className="rounded-xl border border-border/70 bg-muted/15 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">{item.title}</h3>
            {item.isPinned ? <Badge variant="secondary">{t("announcementsPinned")}</Badge> : null}
            {!item.readByUser ? <Badge>{t("announcementsUnread")}</Badge> : null}
          </div>
          <AnnouncementBodyContent body={item.body} bodyFormat={item.bodyFormat} className="mt-2" />
          <p className="mt-2 text-xs text-muted-foreground">
            {new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
              dateStyle: "medium",
            }).format(new Date(item.publishStartAt))}
            {" – "}
            {new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
              dateStyle: "medium",
            }).format(new Date(item.publishEndAt))}
          </p>
          {!item.readByUser ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              disabled={pending}
              onClick={() => startTransition(() => markAnnouncementReadAction(locale, item.id))}
            >
              {t("announcementsMarkRead")}
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
