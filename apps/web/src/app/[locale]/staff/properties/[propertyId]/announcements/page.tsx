import { getTranslations, setRequestLocale } from "next-intl/server";

import { AnnouncementsAdminPanel } from "@/components/announcements-admin-panel";
import { resolveStaffPropertyCapabilities } from "@/lib/staff-property-capabilities";
import { requireStaffPropertyScope } from "@/lib/staff-property-scope";
import { getAnnouncementService, getBlockService, getUnitService } from "@/lib/services";

const PAGE_SIZE = 10;

type Props = {
  params: Promise<{ locale: string; propertyId: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function StaffAnnouncementsPage({ params, searchParams }: Props) {
  const { locale, propertyId } = await params;
  const { page: pageParam } = await searchParams;
  setRequestLocale(locale);

  const { organizationId, property, actorUserId, session } = await requireStaffPropertyScope(locale, propertyId);
  const capabilities = await resolveStaffPropertyCapabilities(session, organizationId, propertyId);
  const page = Math.max(1, Number(pageParam ?? "1") || 1);
  const t = await getTranslations("announcements");

  const [data, blocksPage, unitsPage] = await Promise.all([
    getAnnouncementService().listForAdmin({
      organizationId,
      propertyId,
      page,
      pageSize: PAGE_SIZE,
      staffViewerId: actorUserId,
    }),
    getBlockService().list({ organizationId, propertyId, page: 1, pageSize: 200 }),
    getUnitService().list({ organizationId, propertyId, page: 1, pageSize: 500 }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{property.name}</p>
      </div>
      <AnnouncementsAdminPanel
        locale={locale}
        propertyId={propertyId}
        items={data.items}
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        blocks={blocksPage.items}
        units={unitsPage.items}
        canCreatePublished={false}
        canCreateDraft={capabilities.canCreateAnnouncementDraft}
        canPublish={false}
        listBasePath={`/staff/properties/${propertyId}/announcements`}
      />
    </div>
  );
}
