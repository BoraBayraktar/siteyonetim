import { Building2 } from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { AppMarketingShell } from "@/components/app-marketing-shell";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type MarketingLoginFeature = {
  icon: LucideIcon;
  text: string;
};

type Props = {
  locale: string;
  alternateLocalePath: string;
  brandTitle: string;
  brandSubtitle: string;
  backToHomeHref: string;
  backToHomeLabel: string;
  badge: string;
  heroTitle: string;
  heroDescription: string;
  features: MarketingLoginFeature[];
  cardTitle: string;
  cardDescription: string;
  children: ReactNode;
};

export function MarketingLoginShell({
  locale,
  alternateLocalePath,
  brandTitle,
  brandSubtitle,
  backToHomeHref,
  backToHomeLabel,
  badge,
  heroTitle,
  heroDescription,
  features,
  cardTitle,
  cardDescription,
  children,
}: Props) {
  const alternateLocale = locale === "tr" ? "en" : "tr";

  return (
    <AppMarketingShell>
      <header className="border-b border-border/60 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <Link href={backToHomeHref} className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Building2 className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">{brandTitle}</p>
              <p className="text-xs text-muted-foreground">{brandSubtitle}</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link href={alternateLocalePath}>{alternateLocale.toUpperCase()}</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={backToHomeHref}>{backToHomeLabel}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-10 px-4 py-10 md:px-6 lg:grid-cols-[1fr_420px] lg:items-center lg:py-16">
        <section className="space-y-8">
          <div className="space-y-4">
            <Badge variant="info" className="rounded-full px-3 py-1 font-normal">
              {badge}
            </Badge>
            <div className="space-y-3">
              <h1 className="max-w-xl text-3xl font-semibold tracking-tight md:text-4xl lg:text-5xl">
                {heroTitle}
              </h1>
              <p className="max-w-lg text-base leading-7 text-muted-foreground md:text-lg">
                {heroDescription}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.text} className="border-border/70 bg-card/80 shadow-none backdrop-blur-sm">
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <feature.icon className="size-4" />
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">{feature.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <Card className="border-border/70 bg-card/95 shadow-[0_24px_80px_-24px_rgb(124_58_237/0.25)] backdrop-blur-sm">
            <CardHeader className="space-y-1">
              <CardTitle>{cardTitle}</CardTitle>
              <CardDescription>{cardDescription}</CardDescription>
            </CardHeader>
            <CardContent>{children}</CardContent>
          </Card>
        </section>
      </main>
    </AppMarketingShell>
  );
}
