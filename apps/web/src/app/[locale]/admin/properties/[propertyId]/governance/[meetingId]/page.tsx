import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { listApprovedReportsForMeeting } from "@/app/actions/governance";
import { GovernanceMeetingDetailPanel } from "@/components/governance-meeting-detail-panel";
import { getAdminSession } from "@/lib/cached-admin";
import { resolveStaffPropertyAccess } from "@/lib/staff-admin-access";
import { Button } from "@/components/ui/button";
import { getGovernanceService, getPropertyService, getUnitService } from "@/lib/services";

type Props = {
  params: Promise<{ locale: string; propertyId: string; meetingId: string }>;
};

export default async function PropertyGovernanceMeetingPage({ params }: Props) {
  const { locale, propertyId, meetingId } = await params;
  setRequestLocale(locale);

  const session = await getAdminSession();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    redirect(`/${locale}/login`);
  }
  resolveStaffPropertyAccess(locale, propertyId, session.user.role);

  const organizationId = session.user.organizationId;
  const property = await getPropertyService().getById(organizationId, propertyId);
  if (!property) notFound();

  const ctx = { organizationId, propertyId, actorUserId: session.user.id };
  const [meeting, unitsPage, approvedReports] = await Promise.all([
    getGovernanceService().getMeeting(ctx, meetingId),
    getUnitService().list({ organizationId, propertyId, page: 1, pageSize: 500 }),
    listApprovedReportsForMeeting(organizationId, propertyId),
  ]);

  if (!meeting) notFound();

  const t = await getTranslations("governance");
  const tCommon = await getTranslations("common");
  const backHref = `/${locale}/admin/properties/${propertyId}/governance`;

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 px-0">
          <Link href={backHref}>← {tCommon("back")}</Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">{t("meetingDetailTitle")}</h1>
        <p className="text-sm text-muted-foreground">{property.name}</p>
      </div>
      <GovernanceMeetingDetailPanel
        locale={locale}
        propertyId={propertyId}
        meeting={meeting}
        units={unitsPage.items}
        approvedReports={approvedReports}
        backHref={backHref}
      />
    </div>
  );
}
