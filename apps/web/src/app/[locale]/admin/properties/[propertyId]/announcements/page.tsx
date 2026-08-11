import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { getAdminSession } from "@/lib/cached-admin";
import { canMutateAdminData, canPublishAnnouncements, isStaffRole } from "@/lib/auth-context";
import { requireAdminPropertyScope } from "@/lib/admin-property-scope";
import { staffPropertyHomePath } from "@/lib/staff-admin-access";
import { AnnouncementsAdminPanel } from "@/components/announcements-admin-panel";
import { HelpButton } from "@/components/help-button";
import { Button } from "@/components/ui/button";
import { getAnnouncementService, getBlockService, getPropertyService, getUnitService } from "@/lib/services";

const PAGE_SIZE = 10;

type Props = {
  params: Promise<{ locale: string; propertyId: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function PropertyAnnouncementsPage({ params, searchParams }: Props) {
  const { locale, propertyId } = await params;
  const { page: pageParam } = await searchParams;
  setRequestLocale(locale);

  const session = await getAdminSession();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    redirect(`/${locale}/login`);
  }

  await requireAdminPropertyScope(locale, propertyId, "communication");

  const organizationId = session.user.organizationId;
  const property = await getPropertyService().getById(organizationId, propertyId);
  if (!property) {
    notFound();
  }

  const page = Math.max(1, Number(pageParam ?? "1") || 1);
  const t = await getTranslations("announcements");
  const tCommon = await getTranslations("common");
  const backHref = isStaffRole(session.user.role)
    ? staffPropertyHomePath(locale, propertyId)
    : `/${locale}/admin/properties/${propertyId}`;

  const [data, blocksPage, unitsPage] = await Promise.all([
    getAnnouncementService().listForAdmin({
      organizationId,
      propertyId,
      page,
      pageSize: PAGE_SIZE,
    }),
    getBlockService().list({ organizationId, propertyId, page: 1, pageSize: 200 }),
    getUnitService().list({ organizationId, propertyId, page: 1, pageSize: 500 }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 px-0">
            <Link href={backHref}>← {tCommon("back")}</Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{property.name}</p>
        </div>
        <HelpButton topicKey="announcements" />
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
        canCreatePublished={canMutateAdminData(session)}
        canPublish={canPublishAnnouncements(session)}
      />
    </div>
  );
}
