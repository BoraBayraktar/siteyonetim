"use client";

import type { PropertyWhatsAppProfileDto } from "@siteyonetim/property-settings";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { upsertWhatsAppProfileAction, type WhatsAppActionState } from "@/app/actions/property-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  locale: string;
  propertyId: string;
  profile: PropertyWhatsAppProfileDto | null;
};

const initial: WhatsAppActionState = {};

export function PropertyWhatsAppPanel({ locale, propertyId, profile }: Props) {
  const t = useTranslations("notifications");
  const [state, action, pending] = useActionState(
    upsertWhatsAppProfileAction.bind(null, locale, propertyId),
    initial,
  );
  const [enabled, setEnabled] = useState(profile?.enabled ?? false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("whatsAppTitle")}</CardTitle>
        <CardDescription>{t("whatsAppDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid max-w-lg gap-4">
          <input type="hidden" name="enabled" value={enabled ? "on" : ""} />
          <div className="flex items-center gap-2">
            <Checkbox id="wa-enabled" checked={enabled} onCheckedChange={(v) => setEnabled(v === true)} />
            <Label htmlFor="wa-enabled" className="font-normal">
              {t("whatsAppEnabled")}
            </Label>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="wa-phone-number-id">{t("whatsAppPhoneNumberId")}</Label>
            <Input
              id="wa-phone-number-id"
              name="phoneNumberId"
              defaultValue={profile?.phoneNumberId ?? ""}
              placeholder={t("whatsAppPhoneNumberIdPlaceholder")}
            />
            <p className="text-xs text-muted-foreground">{t("whatsAppPhoneNumberIdHint")}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="wa-template">{t("whatsAppTemplateName")}</Label>
              <Input
                id="wa-template"
                name="templateName"
                defaultValue={profile?.templateName ?? "siteyonetim_duyuru"}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wa-lang">{t("whatsAppTemplateLanguage")}</Label>
              <Input id="wa-lang" name="templateLanguage" defaultValue={profile?.templateLanguage ?? "tr"} required />
            </div>
          </div>
          {state.error ? (
            <p className="text-sm text-destructive">{t(`errors.${state.error}`, { defaultMessage: state.error })}</p>
          ) : null}
          {state.success ? <p className="text-sm text-muted-foreground">{t("whatsAppSaved")}</p> : null}
          <Button type="submit" disabled={pending}>
            {t("whatsAppSave")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
