"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { resolveAdminLandingPathAction } from "@/app/actions/admin-landing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginFormProps = {
  locale: string;
  redirectPath?: string;
  titleKey?: "loginTitle" | "portalLoginTitle" | "auditorLoginTitle";
  resolveAdminLanding?: boolean;
  showAdminRecovery?: boolean;
  embedded?: boolean;
};

export function LoginForm({
  locale,
  redirectPath = `/${locale}/admin/properties`,
  titleKey = "loginTitle",
  resolveAdminLanding = false,
  showAdminRecovery = false,
  embedded = false,
}: LoginFormProps) {
  const t = useTranslations("auth");
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(false);
    const result = await signIn("credentials", {
      email: String(formData.get("email")),
      password: String(formData.get("password")),
      rememberMe: rememberMe ? "true" : "false",
      redirect: false,
    });
    setPending(false);
    if (result?.error) {
      setError(true);
      return;
    }
    const destination = resolveAdminLanding
      ? await resolveAdminLandingPathAction(locale)
      : redirectPath;
    window.location.href = destination;
  }

  return (
    <Card className={embedded ? "border-0 bg-transparent shadow-none" : "mx-auto w-full max-w-md"}>
      {!embedded ? (
        <CardHeader>
          <CardTitle>{t(titleKey)}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className={embedded ? "px-0 pb-0" : undefined}>
        <form
          className="grid gap-4"
          action={async (formData) => {
            await onSubmit(formData);
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="password">{t("password")}</Label>
              {showAdminRecovery ? (
                <Link
                  href={`/${locale}/login/forgot-password`}
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  {t("forgotPassword")}
                </Link>
              ) : null}
            </div>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          {showAdminRecovery ? (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
              />
              {t("rememberMe")}
            </label>
          ) : null}
          {error ? <p className="text-sm text-destructive">{t("invalidCredentials")}</p> : null}
          <Button type="submit" disabled={pending}>
            {t("login")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
