import { createDuesService } from "@siteyonetim/finance-dues";
import { createIncidentService } from "@siteyonetim/itsm-incidents";
import { createOccupancyService } from "@siteyonetim/property-occupancy";
import { createPaymentGatewayService } from "@siteyonetim/payments-gateway";
import { createPropertyTenantService } from "@siteyonetim/platform-tenant";
import { createStandardReportingService } from "@siteyonetim/reporting-standard";
import { createAnnouncementService } from "@siteyonetim/comm-announcements";
import { createDocumentService } from "@siteyonetim/document-management";
import { prisma } from "@siteyonetim/db";

const userId = process.argv[2] ?? "cms5xtu82003g3rtkwysctbr0";

async function main() {
  const party = await prisma.party.findFirst({
    where: { portalUserId: userId, deleted: false },
    select: { organizationId: true },
  });
  if (!party) {
    console.log("No party for user", userId);
    return;
  }

  const organizationId = party.organizationId;
  const dues = createDuesService();
  const reporting = createStandardReportingService();
  const tenantService = createPropertyTenantService();
  const currentYear = new Date().getFullYear();

  const units = await createOccupancyService().listForPortalUser(userId);
  console.log("units", units.length);

  const propertyIds = [...new Set(units.map((unit) => unit.propertyId))];
  const propertyContextEntries = await Promise.all(
    propertyIds.map(async (id) => {
      const propertyUnits = units.filter((unit) => unit.propertyId === id);
      return [
        id,
        {
          propertyName: propertyUnits[0]?.propertyName ?? "",
          unitIds: propertyUnits.map((unit) => unit.unitId),
          settings: await tenantService.getPortalSettings(organizationId, id),
        },
      ] as const;
    }),
  );
  const propertyContexts = new Map(propertyContextEntries);

  let onlinePayment: unknown = null;
  if (propertyIds.length === 1) {
    const singlePropertyId = propertyIds[0]!;
    const settings = propertyContexts.get(singlePropertyId)?.settings;
    console.log("allowOnlinePayment", settings?.allowOnlinePayment);
    if (settings?.allowOnlinePayment) {
      const payer = await createPaymentGatewayService().resolvePortalPayer({
        organizationId,
        propertyId: singlePropertyId,
        portalUserId: userId,
      });
      console.log("payer", payer);
      if (payer) {
        onlinePayment = { propertyId: singlePropertyId, partyId: payer.partyId };
      }
    }
  }

  const scopes = units.map((u) => ({
    propertyId: u.propertyId,
    unitId: u.unitId,
    blockId: u.blockId,
  }));

  const incomeExpensePropertyIds = [...propertyContexts.entries()]
    .filter(([, context]) => context.settings?.showIncomeExpenseReport === true)
    .map(([id]) => id);

  const [openDebt, openDebtLines, statement, announcements, documents, incomeExpenseReports, incidentsData] =
    await Promise.all([
      dues.getPortalOpenDebt(userId),
      dues.getPortalOpenDebtLines(userId),
      dues.getPortalStatement(userId),
      createAnnouncementService().listForPortal({
        organizationId,
        userId,
        scopes,
        page: 1,
        pageSize: 50,
      }),
      createDocumentService().listForPortal({
        organizationId,
        scopes,
        page: 1,
        pageSize: 50,
      }),
      Promise.all(
        incomeExpensePropertyIds.map((id) =>
          reporting.getPortalIncomeExpenseSummary({
            organizationId,
            propertyId: id,
            locale: "tr",
            year: currentYear,
          }),
        ),
      ),
      createIncidentService().listForPortal({
        organizationId,
        reporterUserId: userId,
        reporterCredentialId: null,
        propertyIds: propertyIds,
        page: 1,
        pageSize: 20,
      }),
    ]);

  console.log(
    JSON.stringify(
      {
        openDebt,
        openDebtLines: openDebtLines.length,
        statement: statement.length,
        announcements: announcements.items.length,
        documents: documents.items.length,
        incomeExpenseReports: incomeExpenseReports.length,
        incidents: incidentsData.items.length,
        onlinePayment,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error("PORTAL LOAD FAILED:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
