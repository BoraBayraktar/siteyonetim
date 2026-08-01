import { BarChart3, Building2, Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { MarketingLoginShell } from "@/components/marketing-login-shell";

type Props = {
  locale: string;
  children: ReactNode;
};

export async function AdminLoginShell({ locale, children }: Props) {
  const tAuth = await getTranslations("auth");
  const tHome = await getTranslations("home");

  const features = [
    { icon: Wallet, text: tAuth("adminLoginFeature1") },
    { icon: Building2, text: tAuth("adminLoginFeature2") },
    { icon: BarChart3, text: tAuth("adminLoginFeature3") },
  ];

  return (
    <MarketingLoginShell
      locale={locale}
      alternateLocalePath={`/${locale === "tr" ? "en" : "tr"}/login`}
      brandTitle={tAuth("adminLoginBrandTitle")}
      brandSubtitle={tAuth("adminLoginBrandSubtitle")}
      backToHomeHref={`/${locale}`}
      backToHomeLabel={tHome("brand")}
      badge={tAuth("adminLoginBadge")}
      heroTitle={tAuth("adminLoginHeroTitle")}
      heroDescription={tAuth("adminLoginHeroDescription")}
      features={features}
      cardTitle={tAuth("adminLoginCardTitle")}
      cardDescription={tAuth("adminLoginCardDescription")}
    >
      {children}
    </MarketingLoginShell>
  );
}
