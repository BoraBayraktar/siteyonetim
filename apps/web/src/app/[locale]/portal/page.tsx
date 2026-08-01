import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { getAdminLandingPathForOrganization } from "@/app/actions/admin-landing";
import { auth } from "@/auth";
import { AppMarketingShell } from "@/components/app-marketing-shell";
import { PortalChrome } from "@/components/portal-chrome";
import { PortalDashboard } from "@/components/portal-dashboard";
import { isUnitPortalSession } from "@/lib/auth-context";
import {
  getAnnouncementService,
  getDocumentService,
  getDuesService,
  getOccupancyService,
  getPropertyTenantService,
  getReportingService,
} from "@/lib/services";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function PortalPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) {
    redirect(`/${locale}/portal/login`);
  }
  if (session.user.sessionKind !== "PORTAL") {
    redirect(await getAdminLandingPathForOrganization(locale, session.user.organizationId));
  }

  const dues = getDuesService();
  const reporting = getReportingService();
  const tenantService = getPropertyTenantService();
  const unitPortal = isUnitPortalSession(session);
  const propertyId = session.user.propertyId;
  const unitId = session.user.unitId;
  const currentYear = new Date().getFullYear();

  const units =
    unitPortal && propertyId && unitId
      ? await getOccupancyService().listForPortalUnit(propertyId, unitId)
      : await getOccupancyService().listForPortalUser(session.user.id);

  const propertyIds = [...new Set(units.map((unit) => unit.propertyId))];
  const propertyContextEntries = await Promise.all(
    propertyIds.map(async (id) => {
      const propertyUnits = units.filter((unit) => unit.propertyId === id);
      return [
        id,
        {
          propertyName: propertyUnits[0]?.propertyName ?? "",
          unitIds: propertyUnits.map((unit) => unit.unitId),
          settings: await tenantService.getPortalSettings(session.user.organizationId, id),
        },
      ] as const;
    }),
  );
  const propertyContexts = new Map(propertyContextEntries);

  const primarySettings =
    unitPortal && propertyId ? propertyContexts.get(propertyId)?.settings ?? null : null;

  const scopes = units.map((u) => ({
    propertyId: u.propertyId,
    unitId: u.unitId,
    blockId: u.blockId,
  }));

  const incomeExpensePropertyIds = [...propertyContexts.entries()]
    .filter(([, context]) => context.settings?.showIncomeExpenseReport === true)
    .map(([id]) => id);

  const memberDebtPropertyIds = [...propertyContexts.entries()]
    .filter(([, context]) => context.settings?.showMemberDebtSummary === true)
    .map(([id]) => id);

  const [openDebt, openDebtLines, statement, announcements, documents, incomeExpenseReports, memberDebtSummaries] =
    await Promise.all([
      unitPortal && propertyId && unitId
        ? dues.getPortalOpenDebtForUnit(propertyId, unitId)
        : dues.getPortalOpenDebt(session.user.id),
      unitPortal && propertyId && unitId
        ? dues.getPortalOpenDebtLinesForUnit(propertyId, unitId)
        : dues.getPortalOpenDebtLines(session.user.id),
      unitPortal && propertyId && unitId
        ? dues.getPortalStatementForUnit(propertyId, unitId)
        : dues.getPortalStatement(session.user.id),
      primarySettings?.showAnnouncements !== false
        ? getAnnouncementService().listForPortal({
            organizationId: session.user.organizationId,
            userId: session.user.id,
            scopes,
            page: 1,
            pageSize: 50,
          })
        : Promise.resolve({ items: [], total: 0, page: 1, pageSize: 50 }),
      primarySettings?.showDocuments !== false
        ? getDocumentService().listForPortal({
            organizationId: session.user.organizationId,
            scopes,
            page: 1,
            pageSize: 50,
          })
        : Promise.resolve({ items: [], total: 0, page: 1, pageSize: 50 }),
      Promise.all(
        incomeExpensePropertyIds.map((id) =>
          reporting.getPortalIncomeExpenseSummary({
            organizationId: session.user.organizationId,
            propertyId: id,
            locale,
            year: currentYear,
          }),
        ),
      ),
      Promise.all(
        memberDebtPropertyIds.map((id) => {
          const context = propertyContexts.get(id);
          return dues.getPortalMemberDebtSummary({
            organizationId: session.user.organizationId,
            propertyId: id,
            excludeUnitIds: context?.unitIds ?? [],
          });
        }),
      ),
    ]);

  return (
    <AppMarketingShell>
      <PortalChrome
        locale={locale}
        userName={session.user.name ?? ""}
        organizationName={session.user.organizationName}
      />
      <PortalDashboard
        locale={locale}
        userName={session.user.name ?? ""}
        openDebt={openDebt}
        openDebtLines={openDebtLines}
        units={units}
        statement={statement}
        announcements={announcements.items}
        documents={documents.items}
        incomeExpenseReports={incomeExpenseReports}
        memberDebtSummaries={memberDebtSummaries}
        primarySettings={
          primarySettings
            ? {
                showStatement: primarySettings.showStatement,
                showAnnouncements: primarySettings.showAnnouncements,
                showDocuments: primarySettings.showDocuments,
              }
            : null
        }
      />
    </AppMarketingShell>
  );
}
