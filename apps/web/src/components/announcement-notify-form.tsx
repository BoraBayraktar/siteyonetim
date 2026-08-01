"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import {
  enqueueAnnouncementNotificationsAction,
  type NotificationActionState,
} from "@/app/actions/notifications";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Props = {
  locale: string;
  propertyId: string;
  announcementId: string;
};

const initial: NotificationActionState = {};

export function AnnouncementNotifyForm({ locale, propertyId, announcementId }: Props) {
  const t = useTranslations("notifications");
  const [state, action, pending] = useActionState(
    enqueueAnnouncementNotificationsAction.bind(null, locale, propertyId),
    initial,
  );
  const [email, setEmail] = useState(true);
  const [sms, setSms] = useState(false);
  const [whatsApp, setWhatsApp] = useState(false);
  const [processNow, setProcessNow] = useState(true);

  return (
    <form action={action} className="mt-4 space-y-3 rounded-md border border-dashed p-3">
      <input type="hidden" name="announcementId" value={announcementId} />
      <input type="hidden" name="channelEmail" value={email ? "on" : ""} />
      <input type="hidden" name="channelSms" value={sms ? "on" : ""} />
      <input type="hidden" name="channelWhatsApp" value={whatsApp ? "on" : ""} />
      <input type="hidden" name="processNow" value={processNow ? "on" : ""} />
      <p className="text-xs font-medium text-muted-foreground">{t("announcementNotifyTitle")}</p>
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Checkbox id={`email-${announcementId}`} checked={email} onCheckedChange={(v) => setEmail(v === true)} />
          <Label htmlFor={`email-${announcementId}`} className="font-normal">
            {t("channelEmail")}
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id={`sms-${announcementId}`} checked={sms} onCheckedChange={(v) => setSms(v === true)} />
          <Label htmlFor={`sms-${announcementId}`} className="font-normal">
            {t("channelSms")}
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id={`wa-${announcementId}`}
            checked={whatsApp}
            onCheckedChange={(v) => setWhatsApp(v === true)}
          />
          <Label htmlFor={`wa-${announcementId}`} className="font-normal">
            {t("channelWhatsApp")}
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id={`process-${announcementId}`}
            checked={processNow}
            onCheckedChange={(v) => setProcessNow(v === true)}
          />
          <Label htmlFor={`process-${announcementId}`} className="font-normal">
            {t("processNow")}
          </Label>
        </div>
      </div>
      {state.error ? (
        <p className="text-xs text-destructive">{t(`errors.${state.error}`, { defaultMessage: state.error })}</p>
      ) : null}
      {state.success ? (
        <p className="text-xs text-muted-foreground">{t("enqueueSuccess", { count: state.enqueued ?? 0 })}</p>
      ) : null}
      <Button type="submit" size="sm" variant="secondary" disabled={pending || (!email && !sms && !whatsApp)}>
        {t("enqueueButton")}
      </Button>
    </form>
  );
}
