"use client";

import type { PropertyReportLetterheadProfileDto } from "@siteyonetim/property-settings";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import {
  upsertReportLetterheadProfileAction,
  type ReportLetterheadActionState,
} from "@/app/actions/property-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  locale: string;
  propertyId: string;
  profile: PropertyReportLetterheadProfileDto | null;
};

const initial: ReportLetterheadActionState = {};

export function ReportLetterheadPanel({ locale, propertyId, profile }: Props) {
  const t = useTranslations("reportLetterhead");
  const [state, action, pending] = useActionState(
    upsertReportLetterheadProfileAction.bind(null, locale, propertyId),
    initial,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid max-w-2xl gap-4">
          <div className="grid gap-2">
            <Label htmlFor="letterhead-subtitle">{t("subtitleLine")}</Label>
            <Input
              id="letterhead-subtitle"
              name="subtitleLine"
              defaultValue={profile?.subtitleLine ?? ""}
              placeholder={t("subtitleLinePlaceholder")}
            />
            <p className="text-xs text-muted-foreground">{t("subtitleLineHint")}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="letterhead-ref-tr">{t("documentRefPrefixTr")}</Label>
              <Input
                id="letterhead-ref-tr"
                name="documentRefPrefixTr"
                defaultValue={profile?.documentRefPrefixTr ?? ""}
                placeholder={t("documentRefPrefixTrPlaceholder")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="letterhead-ref-en">{t("documentRefPrefixEn")}</Label>
              <Input
                id="letterhead-ref-en"
                name="documentRefPrefixEn"
                defaultValue={profile?.documentRefPrefixEn ?? ""}
                placeholder={t("documentRefPrefixEnPlaceholder")}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="letterhead-notice-tr">{t("legalNoticeTr")}</Label>
              <Textarea
                id="letterhead-notice-tr"
                name="legalNoticeTr"
                rows={4}
                defaultValue={profile?.legalNoticeTr ?? ""}
                placeholder={t("legalNoticeTrPlaceholder")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="letterhead-notice-en">{t("legalNoticeEn")}</Label>
              <Textarea
                id="letterhead-notice-en"
                name="legalNoticeEn"
                rows={4}
                defaultValue={profile?.legalNoticeEn ?? ""}
                placeholder={t("legalNoticeEnPlaceholder")}
              />
            </div>
          </div>

          {state.error ? <p className="text-sm text-destructive">{t(`errors.${state.error}`)}</p> : null}
          {state.success ? <p className="text-sm text-muted-foreground">{t("saved")}</p> : null}

          <div>
            <Button type="submit" disabled={pending}>
              {pending ? t("saving") : t("save")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
