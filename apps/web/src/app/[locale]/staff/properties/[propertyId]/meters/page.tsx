import { getTranslations, setRequestLocale } from "next-intl/server";

import { DuesMetersPanel } from "@/components/dues-meters-panel";
import { loadStaffMetersData } from "@/lib/load-staff-meters-data";
import { requireStaffPropertyScope } from "@/lib/staff-property-scope";

type Props = {
  params: Promise<{ locale: string; propertyId: string }>;
};

export default async function StaffMetersPage({ params }: Props) {
  const { locale, propertyId } = await params;
  setRequestLocale(locale);
  const { organizationId, property, actorUserId } = await requireStaffPropertyScope(locale, propertyId);
  const t = await getTranslations("meters");

  const { meters, meterUnits, readingsByMeterId } = await loadStaffMetersData({
    organizationId,
    propertyId,
    actorUserId,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("accrualSectionTitle")}</h1>
        <p className="text-sm text-muted-foreground">{property.name}</p>
      </div>
      <DuesMetersPanel
        locale={locale}
        propertyId={propertyId}
        meters={meters}
        meterUnits={meterUnits}
        readingsByMeterId={readingsByMeterId}
        canManageMeters={false}
      />
    </div>
  );
}
