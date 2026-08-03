import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { AuditorReportEditorPanel } from "@/components/auditor-report-editor-panel";
import { AuditorReportAdminActions } from "@/components/auditor-report-admin-actions";
import { getAdminSession } from "@/lib/cached-admin";
import { canManageAuditorAssignments, isAuditorRole } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { getAuditorReportService, getPropertyService } from "@/lib/services";

type Props = {
  params: Promise<{ locale: string; propertyId: string; reportId: string }>;
};

export default async function AdminAuditorReportPage({ params }: Props) {
  const { locale, propertyId, reportId } = await params;
  setRequestLocale(locale);

  const session = await getAdminSession();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    redirect(`/${locale}/login`);
  }
  if (isAuditorRole(session.user.role)) {
    redirect(`/${locale}/auditor/properties/${propertyId}/reports`);
  }

  const organizationId = session.user.organizationId;
  const property = await getPropertyService().getById(organizationId, propertyId);
  if (!property) notFound();

  const report = await getAuditorReportService().getReport({
    organizationId,
    propertyId,
    reportId,
  });
  if (!report) notFound();

  const t = await getTranslations("auditorReport");
  const tCommon = await getTranslations("common");
  const canManage = canManageAuditorAssignments(session);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 px-0">
          <Link href={`/${locale}/admin/properties/${propertyId}/reports`}>← {tCommon("back")}</Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          {property.name} — {t("adminViewTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("legalDisclaimer")}</p>
      </div>

      {canManage ? (
        <AuditorReportAdminActions locale={locale} propertyId={propertyId} report={report} />
      ) : null}

      <AuditorReportEditorPanel
        locale={locale}
        propertyId={propertyId}
        assignmentId={report.assignmentId}
        report={report}
        readOnly
      />
    </div>
  );
}
