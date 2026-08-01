"use client";

import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Props = {
  locale: string;
  emailForm: ReactNode;
};

export function PortalLoginTabs({ locale, emailForm }: Props) {
  const t = useTranslations("auth");
  const tPortal = useTranslations("portal");
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);

  async function onUnitSubmit(formData: FormData) {
    setPending(true);
    setError(false);
    const result = await signIn("unit-credentials", {
      portalCode: String(formData.get("portalCode")),
      blockName: String(formData.get("blockName") ?? ""),
      unitCode: String(formData.get("unitCode")),
      password: String(formData.get("password")),
      redirect: false,
    });
    setPending(false);
    if (result?.error) {
      setError(true);
      return;
    }
    window.location.href = `/${locale}/portal`;
  }

  return (
    <Tabs defaultValue="unit" className="w-full">
      <TabsList className="grid h-10 w-full grid-cols-2">
        <TabsTrigger value="unit">{t("unitLoginTab")}</TabsTrigger>
        <TabsTrigger value="email">{t("emailLoginTab")}</TabsTrigger>
      </TabsList>

      <TabsContent value="unit" className="mt-6 space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">{t("unitLoginTitle")}</p>
          <p className="text-xs text-muted-foreground">{tPortal("unitLoginHint")}</p>
        </div>
        <form
          className="grid gap-4"
          action={async (formData) => {
            await onUnitSubmit(formData);
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="portalCode">{t("portalCode")}</Label>
            <Input id="portalCode" name="portalCode" required autoComplete="organization" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="blockName">{t("blockName")}</Label>
            <Input id="blockName" name="blockName" autoComplete="off" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="unitCode">{t("unitCode")}</Label>
            <Input id="unitCode" name="unitCode" required autoComplete="off" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="unitPassword">{t("password")}</Label>
            <Input
              id="unitPassword"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{t("invalidUnitCredentials")}</p> : null}
          <Button type="submit" disabled={pending} className="w-full">
            {t("login")}
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="email" className="mt-6 space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">{t("portalLoginTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("emailLoginHint")}</p>
        </div>
        {emailForm}
      </TabsContent>
    </Tabs>
  );
}
