import Link from "next/link";
import { FinanceCategoryType } from "@siteyonetim/db";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { getAdminSession } from "@/lib/cached-admin";
import { canManagePropertyIncidents, canMutateAdminData } from "@/lib/auth-context";
import { requireAdminPropertyScope } from "@/lib/admin-property-scope";
import { IncidentsPanel } from "@/components/incidents-panel";
import { Button } from "@/components/ui/button";
import { getFinanceService, getIncidentService, getPropertyService, getUnitService } from "@/lib/services";

const PAGE_SIZE = 10;

type Props = {
  params: Promise<{ locale: string; propertyId: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function PropertyIncidentsPage({ params, searchParams }: Props) {
  const { locale, propertyId } = await params;
  const { page: pageParam } = await searchParams;
  setRequestLocale(locale);

  const session = await getAdminSession();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    redirect(`/${locale}/login`);
  }

  if (!canManagePropertyIncidents(session)) {
    notFound();
  }

  await requireAdminPropertyScope(locale, propertyId);

  const organizationId = session.user.organizationId;
  const property = await getPropertyService().getById(organizationId, propertyId);
  if (!property) {
    notFound();
  }

  const page = Math.max(1, Number(pageParam ?? "1") || 1);
  const t = await getTranslations("incidents");
  const tCommon = await getTranslations("common");
  const managerMode = canMutateAdminData(session);
  const financeCtx = {
    organizationId,
    propertyId,
    actorUserId: session.user.id,
  };

  const [data, unitsPage, categories, cashboxes] = await Promise.all([
    getIncidentService().list({
      organizationId,
      propertyId,
      actorUserId: session.user.id,
      page,
      pageSize: PAGE_SIZE,
    }),
    getUnitService().list({ organizationId, propertyId, page: 1, pageSize: 500 }),
    managerMode ? getFinanceService().listCategories(financeCtx) : Promise.resolve([]),
    managerMode ? getFinanceService().listCashboxes(financeCtx) : Promise.resolve([]),
  ]);

  const expenseCategories = categories.filter((c) => c.type === FinanceCategoryType.EXPENSE);

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 px-0">
          <Link href={`/${locale}/admin/properties/${propertyId}/dashboard`}>← {tCommon("back")}</Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{property.name}</p>
      </div>
      <IncidentsPanel
        locale={locale}
        propertyId={propertyId}
        items={data.items}
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        units={unitsPage.items}
        canCreate
        managerMode={managerMode}
        expenseCategories={expenseCategories}
        cashboxes={cashboxes}
        listBasePath={`/admin/properties/${propertyId}/incidents`}
      />
    </div>
  );
}
