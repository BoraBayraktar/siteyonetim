import { BarChart3, FileText, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { MarketingLoginShell } from "@/components/marketing-login-shell";

type Props = {
  locale: string;
  children: ReactNode;
};

export async function AuditorLoginShell({ locale, children }: Props) {
  const tAuth = await getTranslations("auth");
  const tHome = await getTranslations("home");

  const features = [
    { icon: BarChart3, text: tAuth("auditorLoginFeature1") },
    { icon: ShieldCheck, text: tAuth("auditorLoginFeature2") },
    { icon: FileText, text: tAuth("auditorLoginFeature3") },
  ];

  return (
    <MarketingLoginShell
      locale={locale}
      alternateLocalePath={`/${locale === "tr" ? "en" : "tr"}/auditor/login`}
      brandTitle={tAuth("auditorLoginBrandTitle")}
      brandSubtitle={tAuth("auditorLoginBrandSubtitle")}
      backToHomeHref={`/${locale}`}
      backToHomeLabel={tHome("brand")}
      badge={tAuth("auditorLoginBadge")}
      heroTitle={tAuth("auditorLoginHeroTitle")}
      heroDescription={tAuth("auditorLoginHeroDescription")}
      features={features}
      cardTitle={tAuth("auditorLoginCardTitle")}
      cardDescription={tAuth("auditorLoginCardDescription")}
    >
      {children}
    </MarketingLoginShell>
  );
}
