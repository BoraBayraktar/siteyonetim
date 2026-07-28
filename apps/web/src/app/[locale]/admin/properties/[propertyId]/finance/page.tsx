import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { FinanceTabs } from "@/components/finance-tabs";
import { Button } from "@/components/ui/button";
import { getFinanceService, getPartyService, getPropertyService } from "@/lib/services";

const PAGE_SIZE = 10;

type Props = {
  params: Promise<{ locale: string; propertyId: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function PropertyFinancePage({ params, searchParams }: Props) {
  const { locale, propertyId } = await params;
  const { page: pageParam } = await searchParams;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    redirect(`/${locale}/login`);
  }

  const organizationId = session.user.organizationId;
  const property = await getPropertyService().getById(organizationId, propertyId);
  if (!property) {
    notFound();
  }

  const ctx = { organizationId, propertyId, actorUserId: session.user.id };
  const page = Math.max(1, Number(pageParam ?? "1") || 1);

  const finance = getFinanceService();
  const period = await finance.ensureOpenPeriod(ctx);

  const [categories, accountPage, cashboxes, ledger, partiesPage] = await Promise.all([
    finance.listCategories(ctx),
    finance.listAccounts(ctx, 1, 100),
    finance.listCashboxes(ctx),
    finance.listLedger({ ...ctx, page, pageSize: PAGE_SIZE }),
    getPartyService().list({ organizationId, propertyId: null, page: 1, pageSize: 200 }),
  ]);

  const t = await getTranslations("finance");
  const tDues = await getTranslations("dues");
  const tCommon = await getTranslations("common");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          <Link href={`/${locale}/admin/properties/${propertyId}/dues`}>{tDues("linkDues")}</Link>
        </Button>
      </div>

      <FinanceTabs
        locale={locale}
        propertyId={propertyId}
        period={period}
        categories={categories}
        accounts={accountPage.items}
        cashboxes={cashboxes}
        ledger={ledger}
        parties={partiesPage.items}
      />
    </div>
  );
}
