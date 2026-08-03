import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { GovernanceMeetingsPanel } from "@/components/governance-meetings-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth } from "@/auth";
import { assertAdminPropertyAccess, auditorPortalPath, isAuditorRole } from "@/lib/auth-context";
import { getGovernanceService, getPropertyService } from "@/lib/services";

const PAGE_SIZE = 10;

type Props = {
  params: Promise<{ locale: string; propertyId: string }>;
  searchParams: Promise<{ year?: string; page?: string }>;
};

export default async function AuditorPropertyGovernancePage({ params, searchParams }: Props) {
  const { locale, propertyId } = await params;
  const sp = await searchParams;
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

  const now = new Date();
  const year = Number(sp.year ?? now.getFullYear());
  const page = Math.max(1, Number(sp.page ?? 1));
  const ctx = { organizationId, propertyId, actorUserId: session.user.id };

  const [meetingsPage, approvedReports] = await Promise.all([
    getGovernanceService().listMeetings({ ...ctx, page, pageSize: PAGE_SIZE, year }),
    getGovernanceService().listApprovedReportOptions(ctx, year),
  ]);

  const t = await getTranslations("governance");
  const tCommon = await getTranslations("common");

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 px-0">
          <Link href={auditorPortalPath(locale)}>← {tCommon("back")}</Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          {property.name} — {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("auditorSubtitle")}</p>
      </div>

      <form method="get" className="flex max-w-xs items-end gap-3">
        <div className="grid flex-1 gap-2">
          <Label htmlFor="gov-year">{t("filterYear")}</Label>
          <Input id="gov-year" name="year" type="number" defaultValue={year} />
        </div>
        <Button type="submit" variant="secondary">
          {t("filterApply")}
        </Button>
      </form>

      <GovernanceMeetingsPanel
        locale={locale}
        propertyId={propertyId}
        year={year}
        meetings={meetingsPage.items}
        page={meetingsPage.page}
        pageSize={meetingsPage.pageSize}
        total={meetingsPage.total}
        approvedReports={approvedReports}
        readOnly
      />
    </main>
  );
}
