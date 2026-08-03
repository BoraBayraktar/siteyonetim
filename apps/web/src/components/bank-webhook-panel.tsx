"use client";

import type { CashboxDto } from "@siteyonetim/finance-core";
import type { PropertyBankWebhookProfileDto } from "@siteyonetim/finance-banking";
import { useTranslations } from "next-intl";
import { useActionState, useState, useTransition } from "react";

import {
  rotateBankWebhookSecretAction,
  upsertBankWebhookProfileAction,
  type BankingActionState,
} from "@/app/actions/banking";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ProviderKind = "WEBHOOK_PUSH" | "GENERIC_REST_POLL";

type Props = {
  locale: string;
  propertyId: string;
  cashboxes: CashboxDto[];
  profile: PropertyBankWebhookProfileDto | null;
  webhookUrl: string;
};

const initial: BankingActionState = {};

export function BankWebhookPanel({ locale, propertyId, cashboxes, profile, webhookUrl }: Props) {
  const t = useTranslations("banking");
  const [enabled, setEnabled] = useState(profile?.enabled ?? false);
  const [providerKind, setProviderKind] = useState<ProviderKind>(
    profile?.providerKind === "GENERIC_REST_POLL" ? "GENERIC_REST_POLL" : "WEBHOOK_PUSH",
  );
  const [cashboxId, setCashboxId] = useState(profile?.cashboxId ?? "");
  const [pollUrl, setPollUrl] = useState(profile?.pollUrl ?? "");
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [state, action, pending] = useActionState(
    upsertBankWebhookProfileAction.bind(null, locale, propertyId),
    initial,
  );
  const [rotatePending, startRotate] = useTransition();

  const isWebhookPush = providerKind === "WEBHOOK_PUSH";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("syncTitle")}</CardTitle>
        <CardDescription>{isWebhookPush ? t("webhookDescription") : t("pollDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={action} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="enabled" value={enabled ? "on" : ""} />
          <input type="hidden" name="providerKind" value={providerKind} />
          <input type="hidden" name="cashboxId" value={cashboxId} />

          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="sync-provider">{t("syncProviderKind")}</Label>
            <Select
              value={providerKind}
              onValueChange={(value) => setProviderKind(value as ProviderKind)}
            >
              <SelectTrigger id="sync-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WEBHOOK_PUSH">{t("syncProviderWebhook")}</SelectItem>
                <SelectItem value="GENERIC_REST_POLL">{t("syncProviderRestPoll")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isWebhookPush ? (
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="webhook-url">{t("webhookUrl")}</Label>
              <Input id="webhook-url" readOnly value={webhookUrl} className="font-mono text-xs" />
            </div>
          ) : (
            <>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="poll-url">{t("pollUrl")}</Label>
                <Input
                  id="poll-url"
                  name="pollUrl"
                  type="url"
                  value={pollUrl}
                  onChange={(event) => setPollUrl(event.target.value)}
                  placeholder="https://api.example.com/statements/latest"
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">{t("pollUrlHint")}</p>
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="poll-token">{t("pollBearerToken")}</Label>
                <Input
                  id="poll-token"
                  name="restPollBearerToken"
                  type="password"
                  autoComplete="new-password"
                  placeholder={profile?.hasPollToken ? t("pollBearerTokenPlaceholderSet") : undefined}
                />
                <p className="text-xs text-muted-foreground">
                  {t("pollTokenStatus", {
                    status: profile?.hasPollToken ? t("pollTokenSet") : t("pollTokenMissing"),
                  })}
                </p>
              </div>
            </>
          )}

          <div className="flex items-center gap-2 sm:col-span-2">
            <Checkbox id="webhook-enabled" checked={enabled} onCheckedChange={(v) => setEnabled(v === true)} />
            <Label htmlFor="webhook-enabled" className="font-normal">
              {t("webhookEnabled")}
            </Label>
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="webhook-cashbox">{t("webhookCashbox")}</Label>
            <Select value={cashboxId} onValueChange={setCashboxId}>
              <SelectTrigger id="webhook-cashbox">
                <SelectValue placeholder={t("selectCashbox")} />
              </SelectTrigger>
              <SelectContent>
                {cashboxes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="submit" disabled={pending || cashboxes.length === 0}>
              {pending ? t("webhookSaving") : t("webhookSave")}
            </Button>
            {isWebhookPush ? (
              <Button
                type="button"
                variant="outline"
                disabled={rotatePending}
                onClick={() => {
                  startRotate(async () => {
                    const result = await rotateBankWebhookSecretAction(locale, propertyId);
                    if (result.webhookSecret) {
                      setRevealedSecret(result.webhookSecret);
                    }
                  });
                }}
              >
                {t("webhookRotateSecret")}
              </Button>
            ) : null}
          </div>
        </form>

        <div className="text-xs text-muted-foreground space-y-1">
          {isWebhookPush ? (
            <p>
              {t("webhookSecretStatus", {
                status: profile?.hasSecret || revealedSecret ? t("webhookSecretSet") : t("webhookSecretMissing"),
              })}
            </p>
          ) : null}
          {profile?.lastReceivedAt ? (
            <p>{t("webhookLastReceived", { date: new Date(profile.lastReceivedAt).toLocaleString(locale) })}</p>
          ) : null}
          {!isWebhookPush && profile?.lastPollAt ? (
            <p>{t("pollLastAt", { date: new Date(profile.lastPollAt).toLocaleString(locale) })}</p>
          ) : null}
        </div>

        {revealedSecret ? (
          <div className="rounded-md border bg-muted/40 p-3">
            <p className="mb-2 text-sm font-medium">{t("webhookSecretRevealTitle")}</p>
            <p className="break-all font-mono text-xs">{revealedSecret}</p>
            <p className="mt-2 text-xs text-muted-foreground">{t("webhookSecretRevealHint")}</p>
          </div>
        ) : null}

        {state.success ? <p className="text-sm text-muted-foreground">{t("webhookSaved")}</p> : null}
        {state.error ? (
          <p className="text-sm text-destructive">{t(`errors.${state.error}` as "errors.UNAUTHORIZED")}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
