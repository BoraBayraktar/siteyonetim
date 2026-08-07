import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { GovernanceMeetingsPanel } from "@/components/governance-meetings-panel";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { assertAdminPropertyAccess, auditorPortalPath, isAuditorRole } from "@/lib/auth-context";
import { getAuditorReportService, getGovernanceService, getPropertyService } from "@/lib/services";

const PAGE_SIZE = 10;

type Props = {
  params: Promise<{ locale: string; propertyId: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function AuditorPropertyGovernancePage({ params, searchParams }: Props) {
  const { locale, propertyId } = await params;
  const { page: pageParam } = await searchParams;
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
    getAuditorReportService().listApprovedReports({ organizationId, propertyId }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 px-0">
          <Link href={`${auditorPortalPath(locale)}/properties/${propertyId}/reports`}>← {tCommon("back")}</Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{property.name}</p>
      </div>
      <GovernanceMeetingsPanel
        locale={locale}
        propertyId={propertyId}
        items={meetings.items}
        page={meetings.page}
        pageSize={meetings.pageSize}
        total={meetings.total}
        approvedReports={approvedReports}
        readOnly
      />
    </div>
  );
}
