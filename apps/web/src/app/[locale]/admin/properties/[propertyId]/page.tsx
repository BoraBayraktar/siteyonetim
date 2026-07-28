import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { PropertyDetailTabs } from "@/components/property-detail-tabs";
import { Button } from "@/components/ui/button";
import {
  getBlockService,
  getOccupancyService,
  getPartyService,
  getPropertyService,
  getUnitService,
} from "@/lib/services";

const LIST_SIZE = 50;

type Props = {
  params: Promise<{ locale: string; propertyId: string }>;
};

export default async function PropertyDetailPage({ params }: Props) {
  const { locale, propertyId } = await params;
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

  const tCommon = await getTranslations("common");
  const tFinance = await getTranslations("finance");
  const tDues = await getTranslations("dues");

  const [blocksPage, unitsPage, partiesPage, occupanciesPage, unitOptionsPage, partyOptionsPage] =
    await Promise.all([
      getBlockService().list({ organizationId, propertyId, page: 1, pageSize: LIST_SIZE }),
      getUnitService().list({ organizationId, propertyId, page: 1, pageSize: LIST_SIZE }),
      getPartyService().list({ organizationId, propertyId, page: 1, pageSize: LIST_SIZE }),
      getOccupancyService().listByProperty({ organizationId, propertyId, page: 1, pageSize: LIST_SIZE }),
      getUnitService().list({ organizationId, propertyId, page: 1, pageSize: 200 }),
      getPartyService().list({ organizationId, propertyId: null, page: 1, pageSize: 200 }),
    ]);

  return (
    <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 px-0">
            <Link href={`/${locale}/admin/properties`}>← {tCommon("back")}</Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{property.name}</h1>
          <p className="text-sm text-muted-foreground">{property.address ?? tCommon("none")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`/${locale}/admin/properties/${propertyId}/finance`}>{tFinance("openFinance")}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/${locale}/admin/properties/${propertyId}/dues`}>{tDues("openDues")}</Link>
          </Button>
        </div>
      </div>

      <PropertyDetailTabs
        locale={locale}
        propertyId={propertyId}
        blocks={blocksPage.items}
        units={unitsPage.items}
        parties={partiesPage.items}
        occupancies={occupanciesPage.items}
        unitOptions={unitOptionsPage.items}
        partyOptions={partyOptionsPage.items}
      />
    </div>
  );
}
