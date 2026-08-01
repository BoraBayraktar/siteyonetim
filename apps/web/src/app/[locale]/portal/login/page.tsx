import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { getAdminLandingPathForOrganization } from "@/app/actions/admin-landing";
import { auth } from "@/auth";
import { LoginForm } from "@/components/login-form";
import { PortalLoginShell } from "@/components/portal-login-shell";
import { PortalLoginTabs } from "@/components/portal-login-tabs";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function PortalLoginPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (session?.user?.sessionKind === "PORTAL") {
    redirect(`/${locale}/portal`);
  }
  if (session?.user?.sessionKind === "ADMIN" && session.user.organizationId) {
    redirect(await getAdminLandingPathForOrganization(locale, session.user.organizationId));
  }

  return (
    <PortalLoginShell locale={locale}>
      <PortalLoginTabs
        locale={locale}
        emailForm={
          <LoginForm
            locale={locale}
            redirectPath={`/${locale}/portal`}
            titleKey="portalLoginTitle"
            embedded
          />
        }
      />
    </PortalLoginShell>
  );
}
