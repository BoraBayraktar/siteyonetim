import {
  ArrowRight,
  Building2,
  ChartColumnIncreasing,
  ClipboardCheck,
  LayoutDashboard,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { HomeDashboardPreview } from "@/components/home-dashboard-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getHomeDashboardSnapshot } from "@/lib/home-dashboard-data";
import { cn } from "@/lib/utils";

type Props = {
  locale: string;
};

export async function HomeLanding({ locale }: Props) {
  const t = await getTranslations("home");
  const alternateLocale = locale === "tr" ? "en" : "tr";
  const snapshot = await getHomeDashboardSnapshot(locale);

  const features = [
    {
      icon: Wallet,
      title: t("featureFinanceTitle"),
      description: t("featureFinanceDesc"),
    },
    {
      icon: ChartColumnIncreasing,
      title: t("featureDuesTitle"),
      description: t("featureDuesDesc"),
    },
    {
      icon: Users,
      title: t("featurePortalTitle"),
      description: t("featurePortalDesc"),
    },
    {
      icon: ShieldCheck,
      title: t("featureAuditTitle"),
      description: t("featureAuditDesc"),
    },
  ];

  const portals = [
    {
      icon: LayoutDashboard,
      title: t("accessAdminTitle"),
      description: t("accessAdminDesc"),
      href: `/${locale}/login`,
      cta: t("adminLogin"),
      featured: true,
    },
    {
      icon: Building2,
      title: t("accessPortalTitle"),
      description: t("accessPortalDesc"),
      href: `/${locale}/portal/login`,
      cta: t("goPortalLogin"),
      featured: false,
    },
    {
      icon: ClipboardCheck,
      title: t("accessAuditorTitle"),
      description: t("accessAuditorDesc"),
      href: `/${locale}/auditor/login`,
      cta: t("goAuditorLogin"),
      featured: false,
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,hsl(var(--primary)/0.18),transparent)]" />
      <div className="pointer-events-none absolute -right-24 top-24 size-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 top-64 size-72 rounded-full bg-primary/5 blur-3xl" />

      <header className="relative z-10 border-b border-border/60 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Building2 className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">{t("brand")}</p>
              <p className="text-xs text-muted-foreground">{t("brandTagline")}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/${alternateLocale}`}>{alternateLocale.toUpperCase()}</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={`/${locale}/login`}>{t("adminLogin")}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-7xl px-4 pb-16 pt-12 md:px-6 md:pt-16 lg:pb-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge variant="info" className="rounded-full px-3 py-1 font-normal">
                  {t("badge")}
                </Badge>
                <div className="space-y-3">
                  <h1 className="max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl lg:text-[3.35rem] lg:leading-[1.05]">
                    {t("heroTitle")}
                  </h1>
                  <p className="max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
                    {t("heroDescription")}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link href={`/${locale}/login`}>
                    {t("goAdmin")}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href={`/${locale}/portal/login`}>{t("goPortalLogin")}</Link>
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[t("trust1"), t("trust2"), t("trust3")].map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-border/70 bg-card/70 px-4 py-3 text-sm text-muted-foreground backdrop-blur-sm"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <HomeDashboardPreview locale={locale} snapshot={snapshot} className="lg:translate-y-2" />
          </div>
        </section>

        <section className="border-y bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">{t("featuresLabel")}</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">{t("featuresTitle")}</h2>
              <p className="mt-3 text-muted-foreground">{t("featuresSubtitle")}</p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {features.map((feature) => (
                <Card key={feature.title} className="border-border/70 bg-card/90 shadow-none transition-colors hover:border-primary/20">
                  <CardHeader className="space-y-4">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <feature.icon className="size-5" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-6">{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">{t("accessLabel")}</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">{t("accessTitle")}</h2>
            <p className="mt-3 text-muted-foreground">{t("accessSubtitle")}</p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {portals.map((portal) => (
              <Card
                key={portal.title}
                className={cn(
                  "flex flex-col border-border/70 shadow-none",
                  portal.featured && "border-primary/30 bg-gradient-to-b from-primary/5 to-card",
                )}
              >
                <CardHeader className="space-y-4">
                  <div
                    className={cn(
                      "flex size-11 items-center justify-center rounded-xl",
                      portal.featured ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                    )}
                  >
                    <portal.icon className="size-5" />
                  </div>
                  <div className="space-y-2">
                    <CardTitle>{portal.title}</CardTitle>
                    <CardDescription className="leading-6">{portal.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="mt-auto pt-0">
                  <Button className="w-full" variant={portal.featured ? "default" : "outline"} asChild>
                    <Link href={portal.href}>
                      {portal.cta}
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t bg-background/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between md:px-6">
          <p>{t("footer")}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href={`/${locale}/login`} className="hover:text-foreground">
              {t("adminLogin")}
            </Link>
            <Separator orientation="vertical" className="hidden h-4 md:block" />
            <Link href={`/${locale}/portal/login`} className="hover:text-foreground">
              {t("goPortalLogin")}
            </Link>
            <Separator orientation="vertical" className="hidden h-4 md:block" />
            <Link href={`/${locale}/auditor/login`} className="hover:text-foreground">
              {t("goAuditorLogin")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
