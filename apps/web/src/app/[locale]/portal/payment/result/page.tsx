import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { auth } from "@/auth";
import { AppMarketingShell } from "@/components/app-marketing-shell";
import { PortalChrome } from "@/components/portal-chrome";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; code?: string; intentId?: string }>;
};

export default async function PortalPaymentResultPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { status, code } = await searchParams;
  setRequestLocale(locale);

  const session = await auth();
  const t = await getTranslations("portal");

  const isSuccess = status === "success";

  return (
    <AppMarketingShell>
      <PortalChrome
        locale={locale}
        userName={session?.user?.name ?? ""}
        organizationName={session?.user?.organizationName ?? ""}
      />
      <div className="mx-auto max-w-lg px-4 py-10">
        <Card className="border-border/70 shadow-none">
          <CardHeader>
            <CardTitle>{isSuccess ? t("onlinePaymentResultSuccessTitle") : t("onlinePaymentResultFailedTitle")}</CardTitle>
            <CardDescription>
              {isSuccess ? t("onlinePaymentResultSuccessDescription") : t("onlinePaymentResultFailedDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isSuccess && code ? (
              <p className="text-sm text-muted-foreground">
                {t(`onlinePaymentErrors.${code}`, { defaultMessage: code })}
              </p>
            ) : null}
            <Button asChild>
              <Link href={`/${locale}/portal`}>{t("onlinePaymentBackToPortal")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppMarketingShell>
  );
}
