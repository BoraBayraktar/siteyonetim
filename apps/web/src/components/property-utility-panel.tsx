"use client";

import { HeatingSystemType, HotWaterSystemType } from "@siteyonetim/db";
import type { PropertyUtilityProfileDto } from "@siteyonetim/property-settings";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { upsertUtilityProfileAction, type UtilityActionState } from "@/app/actions/property-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  locale: string;
  propertyId: string;
  profile: PropertyUtilityProfileDto | null;
};

const initial: UtilityActionState = {};

export function PropertyUtilityPanel({ locale, propertyId, profile }: Props) {
  const t = useTranslations("propertyDetail");
  const [state, action, pending] = useActionState(
    upsertUtilityProfileAction.bind(null, locale, propertyId),
    initial,
  );

  const [heating, setHeating] = useState(profile?.heatingSystem ?? HeatingSystemType.NONE);
  const [hotWater, setHotWater] = useState(profile?.hotWaterSystem ?? HotWaterSystemType.NONE);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>{t("tabUtility")}</CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/${locale}/admin/properties/${propertyId}/dues?tab=accrual&section=meters`}>
            {t("openMeters")}
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid max-w-lg gap-4">
          <input type="hidden" name="heatingSystem" value={heating} />
          <input type="hidden" name="hotWaterSystem" value={hotWater} />
          <div className="grid gap-2">
            <Label>{t("heatingSystem")}</Label>
            <Select value={heating} onValueChange={(v) => setHeating(v as HeatingSystemType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(HeatingSystemType).map((v) => (
                  <SelectItem key={v} value={v}>
                    {t(`heating.${v}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>{t("hotWaterSystem")}</Label>
            <Select value={hotWater} onValueChange={(v) => setHotWater(v as HotWaterSystemType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(HotWaterSystemType).map((v) => (
                  <SelectItem key={v} value={v}>
                    {t(`hotWater.${v}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="utility-notes">{t("utilityNotes")}</Label>
            <Textarea id="utility-notes" name="notes" defaultValue={profile?.notes ?? ""} rows={3} />
          </div>
          {state.error ? (
            <p className="text-sm text-destructive">{t(`errors.${state.error}`, { defaultMessage: state.error })}</p>
          ) : null}
          {state.success ? <p className="text-sm text-muted-foreground">{t("utilitySaved")}</p> : null}
          <Button type="submit" disabled={pending}>
            {t("utilitySave")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
