import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { listAdminPropertiesNav, getAdminSession } from "@/lib/cached-admin";
import { resolveStaffLandingPath } from "@/lib/staff-landing-path";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTranslations } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function StaffIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getAdminSession();
  if (!session?.user?.organizationId) {
    redirect(`/${locale}/login`);
  }

  const propertiesNav = await listAdminPropertiesNav(session.user.organizationId);
  if (propertiesNav.length >= 1) {
    redirect(resolveStaffLandingPath(locale, propertiesNav));
  }

  const t = await getTranslations("staffPortal");

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>{t("propertiesEmptyTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("propertiesEmpty")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
