import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { GovernanceMeetingDetailPanel } from "@/components/governance-meeting-detail-panel";
import { auth } from "@/auth";
import { assertAdminPropertyAccess, isAuditorRole } from "@/lib/auth-context";
import { getGovernanceService, getPropertyService } from "@/lib/services";

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

  try {
    await assertAdminPropertyAccess(session, propertyId);
  } catch {
    notFound();
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
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {property.name} — {t("detailTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("auditorSubtitle")}</p>
      </div>

      <GovernanceMeetingDetailPanel
        locale={locale}
        propertyId={propertyId}
        meeting={meeting}
        approvedReports={approvedReports}
        readOnly
      />
    </main>
  );
}
