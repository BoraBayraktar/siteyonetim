import "@/bootstrap-monorepo-env";

import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { AdminLayoutChrome } from "@/components/admin-layout-chrome";
import { signOut } from "@/auth";
import { getAdminSession, listAdminPropertiesNav } from "@/lib/cached-admin";
import { resolveAdminNavCapabilities } from "@/lib/admin-nav-capabilities";
import { auditorPortalPath, canManageOrgUsers, isAuditorRole, isStaffRole } from "@/lib/auth-context";
import { resolveStaffLandingPath } from "@/lib/staff-landing-path";
import { getUserPreferenceService } from "@/lib/services";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getAdminSession();
  if (!session?.user || session.user.sessionKind !== "ADMIN") {
    redirect(`/${locale}/login`);
  }
  if (isAuditorRole(session.user.role)) {
    redirect(auditorPortalPath(locale));
  }
  if (isStaffRole(session.user.role)) {
    const propertiesNav = await listAdminPropertiesNav(session.user.organizationId);
    redirect(resolveStaffLandingPath(locale, propertiesNav));
  }

  async function logoutAction() {
    "use server";
    await signOut({ redirectTo: `/${locale}` });
  }

  const propertiesNav = await listAdminPropertiesNav(session.user.organizationId);
  const preference = await getUserPreferenceService().getPreference({
    userId: session.user.id,
    organizationId: session.user.organizationId,
  });
  const navCapabilities = resolveAdminNavCapabilities(
    session.user.role,
    canManageOrgUsers(session),
    preference?.navProfile ?? null,
  );

  return (
    <AdminLayoutChrome
      locale={locale}
      organizationName={session.user.organizationName}
      userName={session.user.name ?? ""}
      logoutAction={logoutAction}
      propertiesNav={propertiesNav}
      navCapabilities={navCapabilities}
      userRole={session.user.role}
    >
      {children}
    </AdminLayoutChrome>
  );
}
