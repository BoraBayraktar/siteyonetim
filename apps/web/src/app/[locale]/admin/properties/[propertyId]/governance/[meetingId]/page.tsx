import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { GovernanceMeetingDetailPanel } from "@/components/governance-meeting-detail-panel";
import { Button } from "@/components/ui/button";
import { getAdminSession } from "@/lib/cached-admin";
import { isAuditorRole } from "@/lib/auth-context";
import { getGovernanceService, getPropertyService } from "@/lib/services";

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
  if (isAuditorRole(session.user.role)) {
    redirect(`/${locale}/auditor/properties/${propertyId}/governance/${meetingId}`);
  }

  const organizationId = session.user.organizationId;
  const property = await getPropertyService().getById(organizationId, propertyId);
  if (!property) notFound();

  const ctx = { organizationId, propertyId, actorUserId: session.user.id };
  const meeting = await getGovernanceService().getMeeting(ctx, meetingId);
  if (!meeting) notFound();

  const approvedReports = await getGovernanceService().listApprovedReportOptions(ctx, meeting.meetingDate.getFullYear());
  const t = await getTranslations("governance");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {property.name} — {t("detailTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t(`type.${meeting.meetingType}`)}</p>
      </div>

      <GovernanceMeetingDetailPanel
        locale={locale}
        propertyId={propertyId}
        meeting={meeting}
        approvedReports={approvedReports}
      />
    </div>
  );
}
