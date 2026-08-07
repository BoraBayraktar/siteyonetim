"use client";

import type { PropertyStaffOpsProfileDto } from "@siteyonetim/property-settings";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { upsertStaffOpsProfileAction, type StaffOpsActionState } from "@/app/actions/property-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type Props = {
  locale: string;
  propertyId: string;
  profile: PropertyStaffOpsProfileDto;
};

const initial: StaffOpsActionState = {};

export function PropertyStaffOpsPanel({ locale, propertyId, profile }: Props) {
  const t = useTranslations("propertyDetail");
  const [state, action, pending] = useActionState(
    upsertStaffOpsProfileAction.bind(null, locale, propertyId),
    initial,
  );

  const [allowAnnouncementDraft, setAllowAnnouncementDraft] = useState(profile.allowAnnouncementDraft);
  const [allowDocumentUpload, setAllowDocumentUpload] = useState(profile.allowDocumentUpload);
  const [allowIncidents, setAllowIncidents] = useState(profile.allowIncidents);
  const [staffCanViewPartyPhone, setStaffCanViewPartyPhone] = useState(profile.staffCanViewPartyPhone);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("staffOpsTitle")}</CardTitle>
        <CardDescription>{t("staffOpsDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid max-w-lg gap-4">
          <input type="hidden" name="allowAnnouncementDraft" value={allowAnnouncementDraft ? "on" : ""} />
          <input type="hidden" name="allowDocumentUpload" value={allowDocumentUpload ? "on" : ""} />
          <input type="hidden" name="allowIncidents" value={allowIncidents ? "on" : ""} />
          <input type="hidden" name="staffCanViewPartyPhone" value={staffCanViewPartyPhone ? "on" : ""} />
          <div className="flex items-start gap-3">
            <Checkbox
              id="allowAnnouncementDraft"
              checked={allowAnnouncementDraft}
              onCheckedChange={(v) => setAllowAnnouncementDraft(v === true)}
            />
            <div className="grid gap-1">
              <Label htmlFor="allowAnnouncementDraft">{t("staffOpsAllowAnnouncementDraft")}</Label>
              <p className="text-sm text-muted-foreground">{t("staffOpsAllowAnnouncementDraftHint")}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Checkbox
              id="allowDocumentUpload"
              checked={allowDocumentUpload}
              onCheckedChange={(v) => setAllowDocumentUpload(v === true)}
            />
            <div className="grid gap-1">
              <Label htmlFor="allowDocumentUpload">{t("staffOpsAllowDocumentUpload")}</Label>
              <p className="text-sm text-muted-foreground">{t("staffOpsAllowDocumentUploadHint")}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Checkbox
              id="allowIncidents"
              checked={allowIncidents}
              onCheckedChange={(v) => setAllowIncidents(v === true)}
            />
            <div className="grid gap-1">
              <Label htmlFor="allowIncidents">{t("staffOpsAllowIncidents")}</Label>
              <p className="text-sm text-muted-foreground">{t("staffOpsAllowIncidentsHint")}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Checkbox
              id="staffCanViewPartyPhone"
              checked={staffCanViewPartyPhone}
              onCheckedChange={(v) => setStaffCanViewPartyPhone(v === true)}
            />
            <div className="grid gap-1">
              <Label htmlFor="staffCanViewPartyPhone">{t("staffOpsStaffCanViewPartyPhone")}</Label>
              <p className="text-sm text-muted-foreground">{t("staffOpsStaffCanViewPartyPhoneHint")}</p>
            </div>
          </div>
          {state.error ? (
            <p className="text-sm text-destructive">{t(`errors.${state.error}`, { defaultMessage: state.error })}</p>
          ) : null}
          {state.success ? <p className="text-sm text-muted-foreground">{t("staffOpsSaved")}</p> : null}
          <Button type="submit" disabled={pending}>
            {t("staffOpsSave")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
