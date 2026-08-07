"use client";

import type { PropertyBankWebhookProfileDto } from "@siteyonetim/finance-banking";
import type { CashboxDto } from "@siteyonetim/finance-core";
import { BankSyncProviderKind } from "@siteyonetim/db";
import { useTranslations } from "next-intl";
import { useActionState, useState, useTransition } from "react";

import {
  rotateBankWebhookSecretAction,
  upsertBankWebhookProfileAction,
  type BankingActionState,
} from "@/app/actions/banking";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  locale: string;
  propertyId: string;
  cashboxes: CashboxDto[];
  profile: PropertyBankWebhookProfileDto | null;
  webhookEndpoint: string;
};

const initial: BankingActionState = {};

function formatTimestamp(value: Date | string | null, locale: string) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString(locale === "tr" ? "tr-TR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function BankWebhookSettingsPanel({
  locale,
  propertyId,
  cashboxes,
  profile,
  webhookEndpoint,
}: Props) {
  const t = useTranslations("banking");
  const [providerKind, setProviderKind] = useState(
    profile?.providerKind ?? BankSyncProviderKind.WEBHOOK_PUSH,
  );
  const [cashboxId, setCashboxId] = useState(profile?.cashboxId ?? "");
  const [enabled, setEnabled] = useState(profile?.enabled ?? false);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [rotateError, setRotateError] = useState<string | null>(null);
  const [rotatePending, startRotate] = useTransition();

  const [state, action, pending] = useActionState(
    upsertBankWebhookProfileAction.bind(null, locale, propertyId),
    initial,
  );

  const isRestPoll = providerKind === BankSyncProviderKind.GENERIC_REST_POLL;

  function handleRotateSecret() {
    setRotateError(null);
    setRevealedSecret(null);
    startRotate(async () => {
      const result = await rotateBankWebhookSecretAction(locale, propertyId);
      if (result.error) {
        setRotateError(result.error);
        return;
      }
      if (result.webhookSecret) {
        setRevealedSecret(result.webhookSecret);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("syncSettingsTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">{t("syncSettingsHint")}</p>

        <form action={action} className="grid gap-4 lg:grid-cols-2">
          <input type="hidden" name="providerKind" value={providerKind} />
          <input type="hidden" name="cashboxId" value={cashboxId} />
          <input type="hidden" name="enabled" value={enabled ? "on" : ""} />

          <div className="flex items-center gap-2 lg:col-span-2">
            <Checkbox
              id="bank-sync-enabled"
              checked={enabled}
              onCheckedChange={(value) => setEnabled(value === true)}
            />
            <Label htmlFor="bank-sync-enabled">{t("syncEnabled")}</Label>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bank-sync-provider">{t("syncProvider")}</Label>
            <Select
              value={providerKind}
              onValueChange={(value) => setProviderKind(value as BankSyncProviderKind)}
            >
              <SelectTrigger id="bank-sync-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={BankSyncProviderKind.WEBHOOK_PUSH}>
                  {t("providerKind.WEBHOOK_PUSH")}
                </SelectItem>
                <SelectItem value={BankSyncProviderKind.GENERIC_REST_POLL}>
                  {t("providerKind.GENERIC_REST_POLL")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bank-sync-cashbox">{t("syncCashbox")}</Label>
            <Select value={cashboxId} onValueChange={setCashboxId}>
              <SelectTrigger id="bank-sync-cashbox">
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

          {!isRestPoll ? (
            <div className="grid gap-2 lg:col-span-2">
              <Label htmlFor="bank-webhook-url">{t("webhookUrl")}</Label>
              <Input id="bank-webhook-url" readOnly value={webhookEndpoint} />
              <p className="text-xs text-muted-foreground">{t("webhookAuthHint")}</p>
            </div>
          ) : (
            <>
              <div className="grid gap-2 lg:col-span-2">
                <Label htmlFor="bank-poll-url">{t("pollUrl")}</Label>
                <Input
                  id="bank-poll-url"
                  name="pollUrl"
                  type="url"
                  defaultValue={profile?.pollUrl ?? ""}
                  placeholder="https://bank.example.com/statements"
                />
              </div>
              <div className="grid gap-2 lg:col-span-2">
                <Label htmlFor="bank-poll-token">{t("pollToken")}</Label>
                <Input
                  id="bank-poll-token"
                  name="restPollBearerToken"
                  type="password"
                  placeholder={
                    profile?.hasPollToken ? t("pollTokenPlaceholderExisting") : t("pollTokenPlaceholder")
                  }
                />
                <p className="text-xs text-muted-foreground">{t("pollCronHint")}</p>
              </div>
            </>
          )}

          {state.error ? (
            <p className="text-sm text-destructive lg:col-span-2">
              {t(`errors.${state.error}` as "errors.UNAUTHORIZED")}
            </p>
          ) : null}
          {state.success ? (
            <p className="text-sm text-muted-foreground lg:col-span-2">{t("syncSettingsSaved")}</p>
          ) : null}

          <div className="flex flex-wrap gap-2 lg:col-span-2">
            <Button type="submit" disabled={pending || (enabled && !cashboxId)}>
              {t("syncSettingsSave")}
            </Button>
            {!isRestPoll ? (
              <Button type="button" variant="outline" disabled={rotatePending} onClick={handleRotateSecret}>
                {t("rotateWebhookSecret")}
              </Button>
            ) : null}
          </div>
        </form>

        {!isRestPoll && revealedSecret ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
            <p className="font-medium">{t("webhookSecretRevealTitle")}</p>
            <p className="mt-1 break-all font-mono text-xs">{revealedSecret}</p>
            <p className="mt-2 text-muted-foreground">{t("webhookSecretRevealHint")}</p>
          </div>
        ) : null}

        {rotateError ? (
          <p className="text-sm text-destructive">{t(`errors.${rotateError}` as "errors.UNAUTHORIZED")}</p>
        ) : null}

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">{t("lastWebhookAt")}</dt>
            <dd className="font-medium">{formatTimestamp(profile?.lastReceivedAt ?? null, locale)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("lastPollAt")}</dt>
            <dd className="font-medium">{formatTimestamp(profile?.lastPollAt ?? null, locale)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("webhookSecretStatus")}</dt>
            <dd className="font-medium">
              {profile?.hasSecret ? t("webhookSecretConfigured") : t("webhookSecretMissing")}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("pollTokenStatus")}</dt>
            <dd className="font-medium">
              {profile?.hasPollToken ? t("pollTokenConfigured") : t("pollTokenMissing")}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
