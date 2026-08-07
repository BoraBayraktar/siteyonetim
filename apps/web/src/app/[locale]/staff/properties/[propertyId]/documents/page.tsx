import { getTranslations, setRequestLocale } from "next-intl/server";

import { DocumentsAdminPanel } from "@/components/documents-admin-panel";
import { resolveStaffPropertyCapabilities } from "@/lib/staff-property-capabilities";
import { requireStaffPropertyScope } from "@/lib/staff-property-scope";
import { getDocumentService, getUnitService } from "@/lib/services";

const PAGE_SIZE = 10;

type Props = {
  params: Promise<{ locale: string; propertyId: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function StaffDocumentsPage({ params, searchParams }: Props) {
  const { locale, propertyId } = await params;
  const { page: pageParam } = await searchParams;
  setRequestLocale(locale);

  const { organizationId, property, session } = await requireStaffPropertyScope(locale, propertyId);
  const capabilities = await resolveStaffPropertyCapabilities(session, organizationId, propertyId);
  const page = Math.max(1, Number(pageParam ?? "1") || 1);
  const t = await getTranslations("documents");

  const [data, unitsPage] = await Promise.all([
    getDocumentService().listForAdmin({
      organizationId,
      propertyId,
      page,
      pageSize: PAGE_SIZE,
    }),
    getUnitService().list({ organizationId, propertyId, page: 1, pageSize: 500 }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{property.name}</p>
      </div>
      <DocumentsAdminPanel
        locale={locale}
        propertyId={propertyId}
        items={data.items}
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        units={unitsPage.items}
        canUpload={capabilities.canUploadDocuments}
        staffUploadMode
        listBasePath={`/staff/properties/${propertyId}/documents`}
      />
    </div>
  );
}
