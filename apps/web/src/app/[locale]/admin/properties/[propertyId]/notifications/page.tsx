import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { getAdminSession } from "@/lib/cached-admin";
import { resolveStaffPropertyAccess } from "@/lib/staff-admin-access";
import { NotificationsAdminPanel } from "@/components/notifications-admin-panel";
import { PropertyWhatsAppPanel } from "@/components/property-whatsapp-panel";
import { Button } from "@/components/ui/button";
import { getNotificationService, getPropertyService, getPropertySettingsService } from "@/lib/services";

const PAGE_SIZE = 20;

type Props = {
  params: Promise<{ locale: string; propertyId: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function PropertyNotificationsPage({ params, searchParams }: Props) {
  const { locale, propertyId } = await params;
  const { page: pageParam } = await searchParams;
  setRequestLocale(locale);

  const session = await getAdminSession();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    redirect(`/${locale}/login`);
  }
  resolveStaffPropertyAccess(locale, propertyId, session.user.role);

  const organizationId = session.user.organizationId;
  const property = await getPropertyService().getById(organizationId, propertyId);
  if (!property) {
    notFound();
  }

  const page = Math.max(1, Number(pageParam ?? "1") || 1);
  const t = await getTranslations("notifications");
  const tCommon = await getTranslations("common");

  const data = await getNotificationService().listOutbox({
    organizationId,
    propertyId,
    page,
    pageSize: PAGE_SIZE,
  });

  const whatsAppProfile = await getPropertySettingsService().getWhatsAppProfile(organizationId, propertyId);

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 px-0">
          <Link href={`/${locale}/admin/properties/${propertyId}`}>← {tCommon("back")}</Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{property.name}</p>
      </div>
      <PropertyWhatsAppPanel locale={locale} propertyId={propertyId} profile={whatsAppProfile} />
      <NotificationsAdminPanel
        locale={locale}
        propertyId={propertyId}
        items={data.items}
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
      />
    </div>
  );
}
