import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { PropertyDetailTabs } from "@/components/property-detail-tabs";
import { Button } from "@/components/ui/button";
import { getAdminSession } from "@/lib/cached-admin";
import { loadPropertyStructurePageData } from "@/lib/load-property-structure-data";
import {
  propertyStructureNavKey,
  resolvePropertyStructureTab,
  resolveStructureSection,
  structureSectionNavKey,
} from "@/lib/property-structure-tab";
import { getPropertyService } from "@/lib/services";

type Props = {
  params: Promise<{ locale: string; propertyId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function PropertyDetailPage({ params, searchParams }: Props) {
  const { locale, propertyId } = await params;
  const { tab } = await searchParams;
  setRequestLocale(locale);

  const session = await getAdminSession();
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
  const tNav = await getTranslations("nav");

  const outerTab = resolvePropertyStructureTab(tab);
  const structureSection = resolveStructureSection(tab);
  const sectionTitle =
    outerTab === "utility"
      ? tNav(propertyStructureNavKey("utility"))
      : `${tNav("menuStructure")} · ${tNav(structureSectionNavKey(structureSection))}`;

  const structureData = await loadPropertyStructurePageData(
    { organizationId, propertyId },
    tab,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 px-0">
            <Link href={`/${locale}/admin/properties`}>← {tCommon("back")}</Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{property.name}</h1>
          <p className="text-sm font-medium text-foreground/80">{sectionTitle}</p>
          <p className="text-sm text-muted-foreground">{property.address ?? tCommon("none")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`/${locale}/admin/properties/${propertyId}/dues?tab=expenses`}>{tFinance("openFinance")}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/${locale}/admin/properties/${propertyId}/dues`}>{tDues("openDues")}</Link>
          </Button>
        </div>
      </div>

      <PropertyDetailTabs
        locale={locale}
        propertyId={propertyId}
        defaultTab={tab}
        blocks={structureData.blocks}
        unitBoard={structureData.unitBoard}
        propertyParties={structureData.propertyParties}
        orgParties={structureData.orgParties}
        utilityProfile={structureData.utilityProfile}
      />
    </div>
  );
}
