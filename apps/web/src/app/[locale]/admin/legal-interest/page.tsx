import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { LegalInterestPanel } from "@/components/legal-interest-panel";
import { getAdminSession, listAdminPropertiesNav } from "@/lib/cached-admin";
import { resolveAdminLandingPath } from "@/lib/admin-landing-path";
import { redirectStaffFromOrgAdmin } from "@/lib/staff-admin-access";
import { getDuesService } from "@/lib/services";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ year?: string }>;
};

export default async function LegalInterestPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getAdminSession();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    redirect(`/${locale}/login`);
  }
  const propertiesNav = await listAdminPropertiesNav(session.user.organizationId);
  redirectStaffFromOrgAdmin(locale, session.user.role, resolveAdminLandingPath(locale, propertiesNav, session.user.role));

  const sp = await searchParams;
  const year = sp.year ? Number(sp.year) : new Date().getFullYear();
  const rates = await getDuesService().listLegalInterestRates(year);

  return <LegalInterestPanel locale={locale} year={year} rates={rates} />;
}
