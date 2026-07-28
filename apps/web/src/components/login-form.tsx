"use client";

import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginFormProps = {
  locale: string;
  redirectPath?: string;
  titleKey?: "loginTitle" | "portalLoginTitle";
};

export function LoginForm({
  locale,
  redirectPath = `/${locale}/admin/properties`,
  titleKey = "loginTitle",
}: LoginFormProps) {
  const t = useTranslations("auth");
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(false);
    const result = await signIn("credentials", {
      email: String(formData.get("email")),
      password: String(formData.get("password")),
      redirect: false,
    });
    setPending(false);
    if (result?.error) {
      setError(true);
      return;
    }
    window.location.href = redirectPath;
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>{t(titleKey)}</CardTitle>
      </CardHeader>
      <CardContent>
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
            <Label htmlFor="password">{t("password")}</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          {error ? <p className="text-sm text-destructive">{t("invalidCredentials")}</p> : null}
          <Button type="submit" disabled={pending}>
            {t("login")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
