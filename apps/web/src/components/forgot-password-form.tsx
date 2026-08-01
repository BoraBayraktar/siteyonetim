"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { requestPasswordResetAction, type AuthPasswordActionState } from "@/app/actions/auth-password";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  locale: string;
};

const initial: AuthPasswordActionState = {};

export function ForgotPasswordForm({ locale }: Props) {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initial);

  if (state.success) {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("forgotPasswordTitle")}</CardTitle>
          <CardDescription>
            {state.devResetUrl ? t("forgotPasswordDevSuccess") : t("forgotPasswordSuccess")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.devResetUrl ? (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p className="mb-2 font-medium">{t("forgotPasswordDevLinkTitle")}</p>
              <a href={state.devResetUrl} className="break-all text-primary underline-offset-4 hover:underline">
                {state.devResetUrl}
              </a>
              <p className="mt-2 text-muted-foreground">{t("forgotPasswordDevHint")}</p>
            </div>
          ) : null}
          <Button variant="outline" asChild className="w-full">
            <Link href={`/${locale}/login`}>{t("backToLogin")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>{t("forgotPasswordTitle")}</CardTitle>
        <CardDescription>{t("forgotPasswordSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="locale" value={locale} />
          <div className="grid gap-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          {state.error ? (
            <p className="text-sm text-destructive">{t(`errors.${state.error}`, { defaultMessage: state.error })}</p>
          ) : null}
          <Button type="submit" disabled={pending}>
            {t("sendResetLink")}
          </Button>
          <Button variant="ghost" asChild>
            <Link href={`/${locale}/login`}>{t("backToLogin")}</Link>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
