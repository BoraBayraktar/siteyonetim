import { setRequestLocale } from "next-intl/server";

import { PropertyUiModeSync } from "@/components/property-ui-mode-context";
import { requireAdminPropertyScope } from "@/lib/admin-property-scope";
import { propertyUiModeFromDb } from "@/lib/admin-nav-capabilities-types";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string; propertyId: string }>;
};

export default async function PropertyAdminLayout({ children, params }: Props) {
  const { locale, propertyId } = await params;
  setRequestLocale(locale);

  const { property } = await requireAdminPropertyScope(locale, propertyId);
  const propertyUiMode = propertyUiModeFromDb(property.adminUiMode);

  return (
    <>
      <PropertyUiModeSync propertyUiMode={propertyUiMode} />
      {children}
    </>
  );
}
