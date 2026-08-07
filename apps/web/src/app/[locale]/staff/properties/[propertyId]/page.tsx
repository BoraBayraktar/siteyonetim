import { setRequestLocale } from "next-intl/server";

import { StaffDashboardCards } from "@/components/staff-dashboard-cards";
import { resolveStaffPropertyCapabilities } from "@/lib/staff-property-capabilities";
import { requireStaffPropertyScope } from "@/lib/staff-property-scope";
import { getIncidentService } from "@/lib/services";

type Props = {
  params: Promise<{ locale: string; propertyId: string }>;
};

export default async function StaffPropertyHomePage({ params }: Props) {
  const { locale, propertyId } = await params;
  setRequestLocale(locale);
  const { property, organizationId, actorUserId, session } = await requireStaffPropertyScope(locale, propertyId);
  const capabilities = await resolveStaffPropertyCapabilities(session, organizationId, propertyId);

  const summary = capabilities.canManageIncidents
    ? await getIncidentService().getSummary({
        organizationId,
        propertyId,
        actorUserId,
      })
    : null;

  return (
    <StaffDashboardCards
      locale={locale}
      propertyId={propertyId}
      propertyName={property.name}
      capabilities={capabilities}
      openIncidentsCount={summary ? summary.openCount + summary.inProgressCount : 0}
    />
  );
}
