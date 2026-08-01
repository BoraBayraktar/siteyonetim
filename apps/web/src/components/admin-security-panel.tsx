"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";

import {
  beginTotpEnrollmentAction,
  confirmTotpEnrollmentAction,
  disableTotpAction,
  setOrgRequireTwoFactorAction,
  type TotpSecurityActionState,
} from "@/app/actions/auth-totp";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  locale: string;
  totpEnabled: boolean;
  organizationRequiresTwoFactor: boolean;
  canManageOrgPolicy: boolean;
};

const initial: TotpSecurityActionState = {};

function mapError(code: string | undefined, t: ReturnType<typeof useTranslations<"auth">>) {
  if (!code) return null;
  const known = [
    "INVALID_TOTP_CODE",
    "TOTP_ALREADY_ENABLED",
    "TOTP_NOT_ENABLED",
    "INVALID_CREDENTIALS",
    "INVALID_TOTP_ENROLLMENT",
    "UNAUTHORIZED",
  ] as const;
  if (known.includes(code as (typeof known)[number])) {
    return t(`errors.${code}` as "errors.INVALID_TOTP_CODE");
  }
  return code;
}

export function AdminSecurityPanel({
  locale,
  totpEnabled,
  organizationRequiresTwoFactor,
  canManageOrgPolicy,
}: Props) {
  const t = useTranslations("auth");
  const [enrollment, setEnrollment] = useState<{ otpauthUri: string; enrollmentToken: string } | null>(null);
  const [confirmState, confirmAction, confirmPending] = useActionState(confirmTotpEnrollmentAction, initial);
  const [disableState, disableAction, disablePending] = useActionState(disableTotpAction, initial);
  const [orgPending, startOrgTransition] = useTransition();
  const [orgRequires, setOrgRequires] = useState(organizationRequiresTwoFactor);
  const [orgError, setOrgError] = useState<string | null>(null);
  const [enrollPending, startEnrollTransition] = useTransition();

  const qrSrc = useMemo(() => {
    if (!enrollment) {
      return null;
    }
    return `/api/auth/totp/qrcode?uri=${encodeURIComponent(enrollment.otpauthUri)}`;
  }, [enrollment]);

  useEffect(() => {
    if (confirmState.success && confirmState.backupCodes?.length) {
      setEnrollment(null);
    }
  }, [confirmState]);

  useEffect(() => {
    if (disableState.success) {
      setEnrollment(null);
    }
  }, [disableState]);

  function startEnrollment() {
    startEnrollTransition(async () => {
      const result = await beginTotpEnrollmentAction();
      if (result.error || !result.otpauthUri || !result.enrollmentToken) {
        return;
      }
      setEnrollment({ otpauthUri: result.otpauthUri, enrollmentToken: result.enrollmentToken });
    });
  }

  function toggleOrgPolicy(checked: boolean) {
    setOrgError(null);
    startOrgTransition(async () => {
      const result = await setOrgRequireTwoFactorAction(checked);
      if (result.error) {
        setOrgError(mapError(result.error, t));
        return;
      }
      setOrgRequires(checked);
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("securityTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("securitySubtitle")}</p>
      </div>

      <Card className="border-border/70 shadow-none">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>{t("totpSectionTitle")}</CardTitle>
              <CardDescription>{t("totpSectionDescription")}</CardDescription>
            </div>
            <Badge variant={totpEnabled ? "success" : "secondary"}>
              {totpEnabled ? t("totpStatusEnabled") : t("totpStatusDisabled")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!totpEnabled && !enrollment ? (
            <Button type="button" onClick={startEnrollment} disabled={enrollPending}>
              {t("totpEnableAction")}
            </Button>
          ) : null}

          {enrollment ? (
            <form action={confirmAction} className="grid gap-4 rounded-lg border border-border/70 bg-muted/20 p-4">
              <input type="hidden" name="enrollmentToken" value={enrollment.enrollmentToken} />
              <p className="text-sm text-muted-foreground">{t("totpSetupHint")}</p>
              {qrSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrSrc} alt={t("totpQrAlt")} className="mx-auto size-44 rounded-md border bg-white p-2" />
              ) : null}
              <div className="grid gap-2">
                <Label htmlFor="enroll-code">{t("totpCodeLabel")}</Label>
                <Input id="enroll-code" name="code" inputMode="numeric" autoComplete="one-time-code" required />
              </div>
              {mapError(confirmState.error, t) ? (
                <p className="text-sm text-destructive">{mapError(confirmState.error, t)}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => setEnrollment(null)}>
                  {t("totpBack")}
                </Button>
                <Button type="submit" disabled={confirmPending}>
                  {t("totpSetupSubmit")}
                </Button>
              </div>
            </form>
          ) : null}

          {totpEnabled ? (
            <form action={disableAction} className="grid max-w-md gap-4 rounded-lg border border-border/70 p-4">
              <p className="text-sm text-muted-foreground">{t("totpDisableHint")}</p>
              <div className="grid gap-2">
                <Label htmlFor="disable-password">{t("password")}</Label>
                <Input id="disable-password" name="password" type="password" autoComplete="current-password" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="disable-code">{t("totpCodeLabel")}</Label>
                <Input id="disable-code" name="code" inputMode="numeric" autoComplete="one-time-code" required />
              </div>
              {mapError(disableState.error, t) ? (
                <p className="text-sm text-destructive">{mapError(disableState.error, t)}</p>
              ) : null}
              {disableState.success ? <p className="text-sm text-green-600">{t("totpDisableSuccess")}</p> : null}
              <Button type="submit" variant="destructive" disabled={disablePending}>
                {t("totpDisableAction")}
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>

      {canManageOrgPolicy ? (
        <Card className="border-border/70 shadow-none">
          <CardHeader>
            <CardTitle>{t("totpOrgPolicyTitle")}</CardTitle>
            <CardDescription>{t("totpOrgPolicyDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={orgRequires} onCheckedChange={(checked) => toggleOrgPolicy(checked === true)} disabled={orgPending} />
              <span>{t("totpOrgPolicyLabel")}</span>
            </label>
            {orgError ? <p className="mt-2 text-sm text-destructive">{orgError}</p> : null}
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={Boolean(confirmState.backupCodes?.length)} onOpenChange={() => undefined}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("totpBackupCodesTitle")}</DialogTitle>
            <DialogDescription>{t("totpBackupCodesHint")}</DialogDescription>
          </DialogHeader>
          <ul className="grid gap-2 rounded-lg border bg-muted/40 p-4 font-mono text-sm">
            {confirmState.backupCodes?.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
          <DialogFooter>
            <Button type="button" onClick={() => window.location.reload()}>
              {t("totpBackupCodesContinue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
