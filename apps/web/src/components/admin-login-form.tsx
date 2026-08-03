"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import { useMemo, useState } from "react";

import { beginAdminLoginAction, completeLoginChallengeAction } from "@/app/actions/auth-totp";
import { resolveAdminLandingPathAction } from "@/app/actions/admin-landing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Props = {
  locale: string;
  redirectPath?: string;
  resolveAdminLanding?: boolean;
  embedded?: boolean;
  titleKey?: "loginTitle" | "auditorLoginTitle";
};

type Step =
  | { kind: "credentials" }
  | { kind: "totp"; challengeId: string }
  | { kind: "setup"; challengeId: string; otpauthUri: string };

function mapErrorCode(code: string, t: ReturnType<typeof useTranslations<"auth">>) {
  const known = [
    "INVALID_CREDENTIALS",
    "INVALID_TOTP_CODE",
    "INVALID_LOGIN_CHALLENGE",
    "TOTP_TOO_MANY_ATTEMPTS",
  ] as const;
  if (known.includes(code as (typeof known)[number])) {
    return t(`errors.${code}` as "errors.INVALID_CREDENTIALS");
  }
  return t("invalidCredentials");
}

export function AdminLoginForm({
  locale,
  redirectPath = `/${locale}/admin/properties`,
  resolveAdminLanding = false,
  embedded = false,
  titleKey = "loginTitle",
}: Props) {
  const t = useTranslations("auth");
  const [step, setStep] = useState<Step>({ kind: "credentials" });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [pendingBootstrapId, setPendingBootstrapId] = useState<string | null>(null);

  const qrSrc = useMemo(() => {
    if (step.kind !== "setup") {
      return null;
    }
    return `/api/auth/totp/qrcode?uri=${encodeURIComponent(step.otpauthUri)}`;
  }, [step]);

  async function finishRedirect() {
    const destination = resolveAdminLanding ? await resolveAdminLandingPathAction(locale) : redirectPath;
    window.location.href = destination;
  }

  async function establishSession(bootstrapId: string) {
    const result = await signIn("login-bootstrap", {
      bootstrapId,
      redirect: false,
    });
    if (result?.error) {
      setError(t("errors.SESSION_ESTABLISH_FAILED"));
      return false;
    }
    return true;
  }

  async function submitCredentials(formData: FormData) {
    setPending(true);
    setError(null);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const begin = await beginAdminLoginAction({ email, password, rememberMe });
    setPending(false);

    if (!begin.ok) {
      setError(mapErrorCode(begin.error, t));
      return;
    }

    if (begin.result.status === "direct") {
      setPending(true);
      const result = await signIn("credentials", {
        email,
        password,
        rememberMe: rememberMe ? "true" : "false",
        redirect: false,
      });
      setPending(false);
      if (result?.error) {
        setError(t("invalidCredentials"));
        return;
      }
      await finishRedirect();
      return;
    }

    if (begin.result.status === "totp_required") {
      setStep({ kind: "totp", challengeId: begin.result.challengeId });
      return;
    }

    setStep({
      kind: "setup",
      challengeId: begin.result.challengeId,
      otpauthUri: begin.result.otpauthUri,
    });
  }

  async function submitChallenge(formData: FormData) {
    if (step.kind === "credentials") {
      return;
    }

    setPending(true);
    setError(null);
    const code = String(formData.get("code") ?? "");
    const completed = await completeLoginChallengeAction({
      challengeId: step.challengeId,
      code,
      useBackupCode,
    });
    setPending(false);

    if (!completed.ok) {
      setError(mapErrorCode(completed.error, t));
      return;
    }

    if (completed.backupCodes.length > 0) {
      setBackupCodes(completed.backupCodes);
      setPendingBootstrapId(completed.bootstrapId);
      return;
    }

    setPending(true);
    const ok = await establishSession(completed.bootstrapId);
    setPending(false);
    if (!ok) {
      return;
    }
    await finishRedirect();
  }

  async function continueAfterBackupCodes() {
    if (!pendingBootstrapId) {
      return;
    }
    setPending(true);
    const ok = await establishSession(pendingBootstrapId);
    setPending(false);
    if (!ok) {
      return;
    }
    await finishRedirect();
  }

  const cardClass = embedded ? "border-0 bg-transparent shadow-none" : "mx-auto w-full max-w-md";

  if (step.kind === "totp" || step.kind === "setup") {
    return (
      <>
        <Card className={cardClass}>
          {!embedded ? (
            <CardHeader>
              <CardTitle>{step.kind === "setup" ? t("totpSetupTitle") : t("totpVerifyTitle")}</CardTitle>
            </CardHeader>
          ) : null}
          <CardContent className={embedded ? "px-0 pb-0" : undefined}>
            <form className="grid gap-4" action={submitChallenge}>
              {step.kind === "setup" ? (
                <div className="space-y-3 rounded-lg border border-border/70 bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">{t("totpSetupHint")}</p>
                  {qrSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrSrc} alt={t("totpQrAlt")} className="mx-auto size-44 rounded-md border bg-white p-2" />
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("totpVerifyHint")}</p>
              )}

              {step.kind === "totp" ? (
                <Tabs
                  value={useBackupCode ? "backup" : "app"}
                  onValueChange={(value) => {
                    setUseBackupCode(value === "backup");
                    setError(null);
                  }}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="app">{t("totpTabApp")}</TabsTrigger>
                    <TabsTrigger value="backup">{t("totpTabBackup")}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="app" className="mt-4 space-y-2">
                    <Label htmlFor="code">{t("totpCodeLabel")}</Label>
                    {!useBackupCode ? (
                      <Input
                        id="code"
                        name="code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="000000"
                        required
                      />
                    ) : null}
                  </TabsContent>
                  <TabsContent value="backup" className="mt-4 space-y-2">
                    <Label htmlFor="code-backup">{t("totpBackupCodeLabel")}</Label>
                    {useBackupCode ? (
                      <Input
                        id="code-backup"
                        name="code"
                        autoComplete="off"
                        placeholder="ABCD1234"
                        required
                      />
                    ) : null}
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="code">{t("totpCodeLabel")}</Label>
                  <Input
                    id="code"
                    name="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    required
                  />
                </div>
              )}

              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => setStep({ kind: "credentials" })}>
                  {t("totpBack")}
                </Button>
                <Button type="submit" disabled={pending}>
                  {step.kind === "setup" ? t("totpSetupSubmit") : t("totpVerifySubmit")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Dialog open={Boolean(backupCodes?.length)} onOpenChange={() => undefined}>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>{t("totpBackupCodesTitle")}</DialogTitle>
              <DialogDescription>{t("totpBackupCodesHint")}</DialogDescription>
            </DialogHeader>
            <ul className="grid gap-2 rounded-lg border bg-muted/40 p-4 font-mono text-sm">
              {backupCodes?.map((code) => (
                <li key={code}>{code}</li>
              ))}
            </ul>
            <DialogFooter>
              <Button type="button" onClick={continueAfterBackupCodes} disabled={pending}>
                {t("totpBackupCodesContinue")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Card className={cardClass}>
      {!embedded ? (
        <CardHeader>
          <CardTitle>{t(titleKey)}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className={embedded ? "px-0 pb-0" : undefined}>
        <form className="grid gap-4" action={submitCredentials}>
          <div className="grid gap-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Link
                href={`/${locale}/login/forgot-password`}
                className="text-sm text-primary underline-offset-4 hover:underline"
              >
                {t("forgotPassword")}
              </Link>
            </div>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked === true)} />
            {t("rememberMe")}
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending}>
            {t("login")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
