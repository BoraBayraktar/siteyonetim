"use client";

import { PropertyKind } from "@siteyonetim/db";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { createPropertyAction, type CreatePropertyState } from "@/app/actions/properties";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const initialState: CreatePropertyState = {};

export function CreatePropertyForm() {
  const t = useTranslations("properties");
  const [state, formAction, pending] = useActionState(createPropertyAction, initialState);
  const [kind, setKind] = useState<PropertyKind>(PropertyKind.APARTMAN);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("createTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">{t("name")}</Label>
            <Input id="name" name="name" required />
            {state.error === "PROPERTY_NAME_REQUIRED" ? (
              <p className="text-sm text-destructive">{t("name")}</p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">{t("address")}</Label>
            <Input id="address" name="address" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="kind">{t("kind")}</Label>
            <input type="hidden" name="kind" value={kind} />
            <Select value={kind} onValueChange={(value) => setKind(value as PropertyKind)}>
              <SelectTrigger id="kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PropertyKind.APARTMAN}>{t("kindApartment")}</SelectItem>
                <SelectItem value={PropertyKind.APARTMAN_SITE}>{t("kindApartmentSite")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {state.success ? <p className="text-sm text-muted-foreground">{t("createSuccess")}</p> : null}
          <Button type="submit" disabled={pending}>
            {t("createSubmit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
