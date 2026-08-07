import { setRequestLocale } from "next-intl/server";

import { StaffShell } from "@/components/staff-shell";
import { resolveStaffPropertyCapabilities } from "@/lib/staff-property-capabilities";
import { requireStaffPropertyScope } from "@/lib/staff-property-scope";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string; propertyId: string }>;
};

export default async function StaffPropertyLayout({ children, params }: Props) {
  const { locale, propertyId } = await params;
  setRequestLocale(locale);
  const { session, organizationId } = await requireStaffPropertyScope(locale, propertyId);
  const capabilities = await resolveStaffPropertyCapabilities(session, organizationId, propertyId);

  return (
    <StaffShell locale={locale} propertyId={propertyId} capabilities={capabilities}>
      {children}
    </StaffShell>
  );
}
