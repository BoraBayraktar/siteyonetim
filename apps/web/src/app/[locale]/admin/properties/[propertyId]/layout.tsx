import { setRequestLocale } from "next-intl/server";

import { requireAdminPropertyScope } from "@/lib/admin-property-scope";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string; propertyId: string }>;
};

export default async function PropertyAdminLayout({ children, params }: Props) {
  const { locale, propertyId } = await params;
  setRequestLocale(locale);

  await requireAdminPropertyScope(locale, propertyId);

  return children;
}
