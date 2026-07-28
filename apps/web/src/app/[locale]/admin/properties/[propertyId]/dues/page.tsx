import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { DuesTabs } from "@/components/dues-tabs";
import { Button } from "@/components/ui/button";
import { getDuesService, getFinanceService, getPartyService, getPropertyService } from "@/lib/services";

const PAGE_SIZE = 10;

type Props = {
  params: Promise<{ locale: string; propertyId: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function PropertyDuesPage({ params, searchParams }: Props) {
  const { locale, propertyId } = await params;
  const { page: pageParam } = await searchParams;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    redirect(`/${locale}/login`);
  }

  const organizationId = session.user.organizationId;
  const property = await getPropertyService().getById(organizationId, propertyId);
  if (!property) notFound();

  const ctx = { organizationId, propertyId, actorUserId: session.user.id };
  const page = Math.max(1, Number(pageParam ?? "1") || 1);

  const dues = getDuesService();
  const finance = getFinanceService();

  const [definitions, runs, openLines, debtRows, cashboxes, partiesPage] = await Promise.all([
    dues.listDefinitions(ctx),
    dues.listAccrualRuns(ctx),
    dues.listOpenLines(ctx, page, PAGE_SIZE),
    dues.getDebtDashboard(ctx),
    finance.listCashboxes(ctx),
    getPartyService().list({ organizationId, propertyId, page: 1, pageSize: 200 }),
  ]);

  const t = await getTranslations("dues");
  const tCommon = await getTranslations("common");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 px-0">
            <Link href={`/${locale}/admin/properties/${propertyId}`}>← {tCommon("back")}</Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {property.name} — {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/${locale}/admin/properties/${propertyId}/finance`}>{t("linkFinance")}</Link>
        </Button>
      </div>

      <DuesTabs
        locale={locale}
        propertyId={propertyId}
        definitions={definitions}
        runs={runs}
        openLines={{ ...openLines, page, pageSize: PAGE_SIZE }}
        debtRows={debtRows}
        cashboxes={cashboxes}
        parties={partiesPage.items}
      />
    </div>
  );
}
