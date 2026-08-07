import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { AuditorReportEditorPanel } from "@/components/auditor-report-editor-panel";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { assertAdminPropertyAccess, isAuditorRole } from "@/lib/auth-context";
import { getAuditorReportService, getPropertyService } from "@/lib/services";

type Props = {
  params: Promise<{ locale: string; propertyId: string; assignmentId: string }>;
};

export default async function AuditorReportEditPage({ params }: Props) {
  const { locale, propertyId, assignmentId } = await params;
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

  let report;
  try {
    report = await getAuditorReportService().createOrGetDraft({
      organizationId,
      propertyId,
      assignmentId,
      auditorUserId: session.user.id,
    });
  } catch {
    notFound();
  }

  const t = await getTranslations("auditorReport");
  const tCommon = await getTranslations("common");

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 px-0">
          <Link href={`/${locale}/auditor/properties/${propertyId}/reports`}>← {tCommon("back")}</Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          {property.name} — {t("editorPageTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("editorPageSubtitle")}</p>
      </div>

      <AuditorReportEditorPanel
        locale={locale}
        propertyId={propertyId}
        assignmentId={assignmentId}
        report={report}
      />
    </main>
  );
}
