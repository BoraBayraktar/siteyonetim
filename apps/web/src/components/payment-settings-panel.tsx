"use client";

import type { PropertyPaymentProfileDto } from "@siteyonetim/payments-gateway";
import type { CashboxDto } from "@siteyonetim/finance-core";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import { upsertPaymentProfileAction, type PaymentActionState } from "@/app/actions/payments";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  locale: string;
  propertyId: string;
  cashboxes: CashboxDto[];
  profile: PropertyPaymentProfileDto | null;
  canMutate: boolean;
};

const initial: PaymentActionState = {};

export function PaymentSettingsPanel({
  locale,
  propertyId,
  cashboxes,
  profile,
  canMutate,
}: Props) {
  const t = useTranslations("payments");
  const [enabled, setEnabled] = useState(profile?.enabled ?? false);
  const [sandbox, setSandbox] = useState(profile?.sandbox ?? true);
  const [cashboxId, setCashboxId] = useState(profile?.defaultCashboxId ?? "");
  const [state, action, pending] = useActionState(
    upsertPaymentProfileAction.bind(null, locale, propertyId),
    initial,
  );

  return (
    <Card className="border-border/70 shadow-none">
      <CardHeader>
        <CardTitle>{t("profileTitle")}</CardTitle>
        <CardDescription>{t("profileSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4">
          <input type="hidden" name="enabled" value={enabled ? "on" : "off"} />
          <input type="hidden" name="sandbox" value={sandbox ? "on" : "off"} />
          <input type="hidden" name="defaultCashboxId" value={cashboxId} />

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={enabled}
              onCheckedChange={(value) => setEnabled(value === true)}
              disabled={!canMutate}
            />
            {t("enabled")}
          </label>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={sandbox}
              onCheckedChange={(value) => setSandbox(value === true)}
              disabled={!canMutate}
            />
            {t("sandbox")}
          </label>

          <div className="grid gap-2">
            <Label htmlFor="paymentApiKey">{t("apiKey")}</Label>
            <Input
              id="paymentApiKey"
              name="apiKey"
              defaultValue={profile?.apiKey ?? ""}
              disabled={!canMutate}
              autoComplete="off"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="paymentSecretKey">
              {t("secretKey")}
              {profile?.hasSecret ? ` (${t("secretConfigured")})` : ""}
            </Label>
            <Input
              id="paymentSecretKey"
              name="secretKey"
              type="password"
              placeholder={profile?.hasSecret ? t("secretPlaceholder") : undefined}
              disabled={!canMutate}
              autoComplete="new-password"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="paymentCashbox">{t("defaultCashbox")}</Label>
            <Select value={cashboxId} onValueChange={setCashboxId} disabled={!canMutate}>
              <SelectTrigger id="paymentCashbox">
                <SelectValue placeholder={t("selectCashbox")} />
              </SelectTrigger>
              <SelectContent>
                {cashboxes.map((cashbox) => (
                  <SelectItem key={cashbox.id} value={cashbox.id}>
                    {cashbox.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {canMutate ? (
            <Button type="submit" size="sm" disabled={pending}>
              {t("saveProfile")}
            </Button>
          ) : null}

          {state.error ? (
            <p className="text-sm text-destructive">{t(`errors.${state.error}`, { defaultMessage: state.error })}</p>
          ) : null}
          {state.success ? <p className="text-sm text-green-600">{t("saved")}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}
