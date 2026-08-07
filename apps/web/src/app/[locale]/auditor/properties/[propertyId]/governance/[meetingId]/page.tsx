import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { GovernanceMeetingDetailPanel } from "@/components/governance-meeting-detail-panel";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { assertAdminPropertyAccess, auditorPortalPath, isAuditorRole } from "@/lib/auth-context";
import { getAuditorReportService, getGovernanceService, getPropertyService, getUnitService } from "@/lib/services";

type Props = {
  params: Promise<{ locale: string; propertyId: string; meetingId: string }>;
};

export default async function AuditorPropertyGovernanceMeetingPage({ params }: Props) {
  const { locale, propertyId, meetingId } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    redirect(`/${locale}/auditor/login`);
  }
  if (!isAuditorRole(session.user.role)) {
    redirect(`/${locale}/login`);
  }

  const organizationId = session.user.organizationId;
  const property = await getPropertyService().getById(organizationId, propertyId);
  if (!property) notFound();

  try {
    await assertAdminPropertyAccess(session, propertyId);
  } catch {
    notFound();
  }

  const ctx = { organizationId, propertyId, actorUserId: session.user.id };
  const [meeting, unitsPage, approvedReports] = await Promise.all([
    getGovernanceService().getMeeting(ctx, meetingId),
    getUnitService().list({ organizationId, propertyId, page: 1, pageSize: 500 }),
    getAuditorReportService().listApprovedReports({ organizationId, propertyId }),
  ]);

  if (!meeting) notFound();

  const tCommon = await getTranslations("common");
  const backHref = `/${locale}/auditor/properties/${propertyId}/governance`;

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 px-0">
          <Link href={backHref}>← {tCommon("back")}</Link>
        </Button>
      </div>
      <GovernanceMeetingDetailPanel
        locale={locale}
        propertyId={propertyId}
        meeting={meeting}
        units={unitsPage.items}
        approvedReports={approvedReports}
        readOnly
        backHref={backHref}
      />
    </div>
  );
}
