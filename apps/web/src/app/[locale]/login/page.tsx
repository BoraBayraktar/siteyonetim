import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { getAdminLandingPathForOrganization } from "@/app/actions/admin-landing";
import { auth } from "@/auth";
import { AdminLoginShell } from "@/components/admin-login-shell";
import { AdminLoginForm } from "@/components/admin-login-form";
import { auditorPortalPath, isAuditorRole } from "@/lib/auth-context";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (session?.user?.sessionKind === "ADMIN" && session.user.organizationId) {
    if (isAuditorRole(session.user.role)) {
      redirect(auditorPortalPath(locale));
    }
    redirect(await getAdminLandingPathForOrganization(locale, session.user.organizationId));
  }
  if (session?.user?.sessionKind === "PORTAL") {
    redirect(`/${locale}/portal`);
  }

  return (
    <AdminLoginShell locale={locale}>
      <AdminLoginForm locale={locale} resolveAdminLanding embedded />
    </AdminLoginShell>
  );
}
