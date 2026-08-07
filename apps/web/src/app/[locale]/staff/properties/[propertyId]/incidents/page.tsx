import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { IncidentsPanel } from "@/components/incidents-panel";
import { staffPropertyPath } from "@/lib/staff-landing-path";
import { resolveStaffPropertyCapabilities } from "@/lib/staff-property-capabilities";
import { requireStaffPropertyScope } from "@/lib/staff-property-scope";
import { getIncidentService, getUnitService } from "@/lib/services";

const PAGE_SIZE = 10;

type Props = {
  params: Promise<{ locale: string; propertyId: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function StaffIncidentsPage({ params, searchParams }: Props) {
  const { locale, propertyId } = await params;
  const { page: pageParam } = await searchParams;
  setRequestLocale(locale);

  const { organizationId, property, actorUserId, session } = await requireStaffPropertyScope(locale, propertyId);
  const capabilities = await resolveStaffPropertyCapabilities(session, organizationId, propertyId);
  if (!capabilities.canManageIncidents) {
    redirect(staffPropertyPath(locale, propertyId));
  }
  const page = Math.max(1, Number(pageParam ?? "1") || 1);
  const t = await getTranslations("incidents");

  const [data, unitsPage] = await Promise.all([
    getIncidentService().list({
      organizationId,
      propertyId,
      actorUserId,
      page,
      pageSize: PAGE_SIZE,
    }),
    getUnitService().list({ organizationId, propertyId, page: 1, pageSize: 500 }),
  ]);

  return (
    <div className="space-y-4">
      <div>
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
        listBasePath={`/staff/properties/${propertyId}/incidents`}
      />
    </div>
  );
}
