import "@/bootstrap-monorepo-env";

import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { AdminLayoutChrome } from "@/components/admin-layout-chrome";
import { signOut } from "@/auth";
import { getAdminSession, listAdminPropertiesNav } from "@/lib/cached-admin";
import { auditorPortalPath, canManageOrgUsers, isAuditorRole } from "@/lib/auth-context";

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

  async function logoutAction() {
    "use server";
    await signOut({ redirectTo: `/${locale}` });
  }

  const propertiesNav = await listAdminPropertiesNav(session.user.organizationId);

  return (
    <AdminLayoutChrome
      locale={locale}
      organizationName={session.user.organizationName}
      userName={session.user.name ?? ""}
      logoutAction={logoutAction}
      propertiesNav={propertiesNav}
      canManageOrgUsers={canManageOrgUsers(session)}
    >
      {children}
    </AdminLayoutChrome>
  );
}
