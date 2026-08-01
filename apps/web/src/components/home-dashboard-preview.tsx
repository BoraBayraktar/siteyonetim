import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HomeDashboardSnapshot } from "@/lib/home-dashboard-data";
import { cn } from "@/lib/utils";

type Props = {
  locale: string;
  snapshot: HomeDashboardSnapshot | null;
  className?: string;
};

function money(value: string, locale: string) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: "TRY",
  }).format(Number(value));
}

function formatMonthLabel(year: number, month: number, locale: string) {
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
    month: "short",
  }).format(new Date(year, month - 1, 1));
}

function formatPeriodMonth(month: number, year: number, locale: string) {
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function normalizeTrend(values: string[]) {
  const numeric = values.map((value) => Math.max(0, Number(value)));
  const max = Math.max(...numeric, 1);
  return numeric.map((value) => Math.max(8, Math.round((value / max) * 100)));
}

export async function HomeDashboardPreview({ locale, snapshot, className }: Props) {
  const t = await getTranslations("home.preview");

  if (!snapshot) {
    return (
      <div
        className={cn(
          "flex min-h-[420px] items-center justify-center rounded-2xl border bg-card/80 p-8 text-center shadow-[0_24px_80px_-24px_rgb(124_58_237/0.2)]",
          className,
        )}
      >
        <div className="space-y-2">
          <p className="text-lg font-semibold">{t("emptyTitle")}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{t("emptyDescription")}</p>
        </div>
      </div>
    );
  }

  const { dashboard, propertyName } = snapshot;
  const periodLabel = formatPeriodMonth(dashboard.month, dashboard.year, locale);
  const chartHeights = normalizeTrend(snapshot.monthlyCollectionTrend.map((item) => item.amount));

  const stats = [
    {
      label: t("statUnits"),
      value: String(snapshot.unitCount),
      trend: t("statUnitsTrend", {
        occupied: snapshot.occupiedUnitCount,
        total: snapshot.unitCount,
      }),
      tone: "primary" as const,
    },
    {
      label: t("statDebt"),
      value: money(dashboard.totalDebt, locale),
      trend: t("statDebtTrend", { count: dashboard.overdueUnitCount }),
      tone: "warning" as const,
    },
    {
      label: t("statCollection"),
      value:
        snapshot.collectionRate !== null
          ? t("statCollectionValue", { rate: snapshot.collectionRate })
          : money(dashboard.monthlyCollected, locale),
      trend:
        snapshot.collectionRate !== null
          ? t("statCollectionTrend", { period: periodLabel })
          : t("statCollectionAmountTrend", { amount: money(dashboard.monthlyCollected, locale) }),
      tone: "success" as const,
    },
    {
      label: t("statMembers"),
      value: String(snapshot.memberCount),
      trend: t("statMembersTrend", { count: snapshot.memberCount }),
      tone: "info" as const,
    },
  ];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-card shadow-[0_24px_80px_-24px_rgb(124_58_237/0.35)]",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="size-2.5 rounded-full bg-red-400/80" />
          <div className="size-2.5 rounded-full bg-amber-400/80" />
          <div className="size-2.5 rounded-full bg-emerald-400/80" />
        </div>
        <Badge variant="success" className="font-normal">
          {propertyName}
        </Badge>
      </div>

      <div className="grid lg:grid-cols-[220px_1fr]">
        <aside className="hidden border-r bg-muted/20 p-4 lg:block">
          <div className="mb-6 flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/15" />
            <div className="space-y-1">
              <p className="truncate text-xs font-medium">{propertyName}</p>
              <p className="text-[11px] text-muted-foreground">{t("sectionLabel")}</p>
            </div>
          </div>
          <div className="space-y-2">
            {[t("navOverview"), t("navFinance"), t("navDues"), t("navReports")].map((item, index) => (
              <div
                key={item}
                className={cn(
                  "rounded-lg px-3 py-2 text-xs font-medium",
                  index === 0 ? "bg-primary/10 text-primary" : "text-muted-foreground",
                )}
              >
                {item}
              </div>
            ))}
          </div>
        </aside>

        <div className="space-y-4 p-4 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {t("sectionLabel")}
              </p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight md:text-xl">{propertyName}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t("subtitle", { period: periodLabel })}</p>
            </div>
            <div className="rounded-lg border bg-background px-3 py-2 text-right">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("cashboxLabel")}</p>
              <p className="text-sm font-semibold">{money(dashboard.cashboxBalance, locale)}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.label} className="border-border/70 shadow-none">
                <CardHeader className="space-y-0 p-4 pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">{stat.label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 p-4 pt-0">
                  <p className="text-2xl font-semibold tracking-tight">{stat.value}</p>
                  <Badge
                    variant={
                      stat.tone === "success"
                        ? "success"
                        : stat.tone === "warning"
                          ? "warning"
                          : stat.tone === "info"
                            ? "info"
                            : "secondary"
                    }
                    className="font-normal"
                  >
                    {stat.trend}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <Card className="border-border/70 shadow-none">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-medium">{t("chartTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex h-44 items-end gap-2 rounded-xl bg-muted/30 p-4">
                  {chartHeights.map((height, index) => {
                    const point = snapshot.monthlyCollectionTrend[index]!;
                    return (
                      <div key={`${point.year}-${point.month}`} className="flex flex-1 flex-col items-center justify-end gap-2">
                        <div
                          className={cn(
                            "w-full rounded-t-md bg-gradient-to-t from-primary/80 to-primary/30",
                            index === chartHeights.length - 1 && "from-primary to-primary/50",
                          )}
                          style={{ height: `${height}%` }}
                          title={money(point.amount, locale)}
                        />
                        <span className="text-[10px] text-muted-foreground">
                          {formatMonthLabel(point.year, point.month, locale)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 shadow-none">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-medium">{t("activityTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4 pt-0">
                {snapshot.recentActivities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("activityEmpty")}</p>
                ) : (
                  snapshot.recentActivities.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{t("activityHint")}</p>
                      </div>
                      <Badge
                        variant={item.tone === "success" ? "success" : item.tone === "primary" ? "info" : "secondary"}
                      >
                        {item.tone === "muted" ? "−" : "+"}
                        {money(item.amount, locale)}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
