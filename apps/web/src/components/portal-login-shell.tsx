import { FileText, Megaphone, Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { MarketingLoginShell } from "@/components/marketing-login-shell";

type Props = {
  locale: string;
  children: ReactNode;
};

export async function PortalLoginShell({ locale, children }: Props) {
  const tPortal = await getTranslations("portal");

  const features = [
    { icon: Wallet, text: tPortal("loginFeature1") },
    { icon: Megaphone, text: tPortal("loginFeature2") },
    { icon: FileText, text: tPortal("loginFeature3") },
  ];

  return (
    <MarketingLoginShell
      locale={locale}
      alternateLocalePath={`/${locale === "tr" ? "en" : "tr"}/portal/login`}
      brandTitle={tPortal("brandTitle")}
      brandSubtitle={tPortal("brandSubtitle")}
      backToHomeHref={`/${locale}`}
      backToHomeLabel={tPortal("backToHome")}
      badge={tPortal("loginBadge")}
      heroTitle={tPortal("loginHeroTitle")}
      heroDescription={tPortal("loginHeroDescription")}
      features={features}
      cardTitle={tPortal("loginCardTitle")}
      cardDescription={tPortal("loginCardDescription")}
    >
      {children}
    </MarketingLoginShell>
  );
}
