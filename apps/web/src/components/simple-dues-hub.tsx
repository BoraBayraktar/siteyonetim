"use client";

import { Coins, Wallet } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DuesTab } from "@/lib/dues-tab";

type Props = {
  locale: string;
  propertyId: string;
  activeTab: DuesTab;
};

export function SimpleDuesHub({ locale, propertyId, activeTab }: Props) {
  const t = useTranslations("uiMode");
  const base = `/${locale}/admin/properties/${propertyId}/dues`;

  const cards = [
    {
      key: "accrual",
      tab: "accrual" as const,
      href: `${base}?tab=accrual`,
      title: t("simpleDuesAccrualTitle"),
      description: t("simpleDuesAccrualDesc"),
      icon: Coins,
    },
    {
      key: "register",
      tab: "register" as const,
      href: `${base}?tab=register`,
      title: t("simpleDuesRegisterTitle"),
      description: t("simpleDuesRegisterDesc"),
      icon: Wallet,
    },
  ] as const;

  return (
    <nav aria-label={t("simpleDuesNavLabel")} className="grid gap-3 sm:grid-cols-2">
      {cards.map((card) => {
        const active = activeTab === card.tab;
        return (
          <Link key={card.key} href={card.href} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Card
              className={cn(
                "h-full transition-colors hover:bg-muted/30",
                active && "border-primary bg-accent/40",
              )}
            >
              <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
                <card.icon className="size-5 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0">
                  <CardTitle className="text-base">{card.title}</CardTitle>
                  <CardDescription className="mt-1">{card.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs font-medium text-primary">{active ? t("simpleDuesActive") : t("simpleDuesOpen")}</p>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </nav>
  );
}
