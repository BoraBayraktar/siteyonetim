import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { listApprovedReportsForMeeting } from "@/app/actions/governance";
import { GovernanceMeetingsPanel } from "@/components/governance-meetings-panel";
import { HelpButton } from "@/components/help-button";
import { getAdminSession } from "@/lib/cached-admin";
import { resolveStaffPropertyAccess } from "@/lib/staff-admin-access";
import { Button } from "@/components/ui/button";
import { getGovernanceService, getPropertyService } from "@/lib/services";

const PAGE_SIZE = 10;

type Props = {
  params: Promise<{ locale: string; propertyId: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function PropertyGovernancePage({ params, searchParams }: Props) {
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
  if (!property) notFound();

  const page = Math.max(1, Number(pageParam ?? "1") || 1);
  const t = await getTranslations("governance");
  const tCommon = await getTranslations("common");

  const [meetings, approvedReports] = await Promise.all([
    getGovernanceService().listMeetings({
      organizationId,
      propertyId,
      actorUserId: session.user.id,
      page,
      pageSize: PAGE_SIZE,
    }),
    listApprovedReportsForMeeting(organizationId, propertyId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 px-0">
            <Link href={`/${locale}/admin/properties/${propertyId}/dashboard`}>← {tCommon("back")}</Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{property.name}</p>
        </div>
        <HelpButton topicKey="governance" />
      </div>
      <GovernanceMeetingsPanel
        locale={locale}
        propertyId={propertyId}
        items={meetings.items}
        page={meetings.page}
        pageSize={meetings.pageSize}
        total={meetings.total}
        approvedReports={approvedReports}
      />
    </div>
  );
}
