import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { getAdminSession } from "@/lib/cached-admin";
import { isStaffRole } from "@/lib/auth-context";
import { staffMetersPath } from "@/lib/staff-admin-access";

type Props = {
  params: Promise<{ locale: string; propertyId: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function PropertyFinancePage({ params, searchParams }: Props) {
  const { locale, propertyId } = await params;
  const { page } = await searchParams;
  setRequestLocale(locale);

  const session = await getAdminSession();
  if (isStaffRole(session?.user?.role)) {
    redirect(staffMetersPath(locale, propertyId));
  }

  const query = new URLSearchParams({ tab: "expenses" });
  if (page) {
    query.set("page", page);
  }

  redirect(`/${locale}/admin/properties/${propertyId}/dues?${query.toString()}`);
}
