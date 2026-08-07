"use client";

import { AnnouncementWorkflowStatus } from "@siteyonetim/db";
import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { publishAnnouncementAction } from "@/app/actions/announcements";
import { Button } from "@/components/ui/button";

type Props = {
  locale: string;
  propertyId: string;
  announcementId: string;
};

export function PublishAnnouncementButton({ locale, propertyId, announcementId }: Props) {
  const t = useTranslations("announcements");
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="default"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await publishAnnouncementAction(locale, propertyId, announcementId);
        });
      }}
    >
      {pending ? t("publishing") : t("approvePublish")}
    </Button>
  );
}

export function isAnnouncementDraft(item: { workflowStatus: AnnouncementWorkflowStatus }): boolean {
  return item.workflowStatus === AnnouncementWorkflowStatus.DRAFT;
}
