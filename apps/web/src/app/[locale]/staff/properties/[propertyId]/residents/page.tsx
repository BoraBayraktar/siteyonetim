import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";

import { HelpButton } from "@/components/help-button";
import { StaffResidentsPanel } from "@/components/staff-residents-panel";
import { resolveStaffPropertyCapabilities } from "@/lib/staff-property-capabilities";
import { requireStaffPropertyScope } from "@/lib/staff-property-scope";
import { getOccupancyService } from "@/lib/services";

const PAGE_SIZE = 500;

type Props = {
  params: Promise<{ locale: string; propertyId: string }>;
};

export default async function StaffResidentsPage({ params }: Props) {
  const { locale, propertyId } = await params;
  setRequestLocale(locale);

  const { organizationId, property, session } = await requireStaffPropertyScope(locale, propertyId);
  const capabilities = await resolveStaffPropertyCapabilities(session, organizationId, propertyId);
  const t = await getTranslations("staffPortal");

  const board = await getOccupancyService().listUnitBoard({
    organizationId,
    propertyId,
    page: 1,
    pageSize: PAGE_SIZE,
    includePartyContact: capabilities.staffCanViewPartyPhone,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("residentsTitle")}</h1>
          <p className="text-sm text-muted-foreground">{property.name}</p>
        </div>
        <HelpButton topicKey="staffResidents" />
      </div>
      <StaffResidentsPanel items={board.items} showPartyPhone={capabilities.staffCanViewPartyPhone} />
    </div>
  );
}
