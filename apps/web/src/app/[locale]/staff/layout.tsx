import "@/bootstrap-monorepo-env";

import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { signOut } from "@/auth";
import { StaffHeader } from "@/components/staff-header";
import { getAdminSession, listAdminPropertiesNav } from "@/lib/cached-admin";
import { auditorPortalPath, isAuditorRole, isStaffRole } from "@/lib/auth-context";
import { resolveAdminLandingPath } from "@/lib/admin-landing-path";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function StaffRootLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getAdminSession();

  if (!session?.user || session.user.sessionKind !== "ADMIN") {
    redirect(`/${locale}/login`);
  }
  if (isAuditorRole(session.user.role)) {
    redirect(auditorPortalPath(locale));
  }
  if (!isStaffRole(session.user.role)) {
    const propertiesNav = await listAdminPropertiesNav(session.user.organizationId);
    redirect(resolveAdminLandingPath(locale, propertiesNav, session.user.role));
  }

  async function logoutAction() {
    "use server";
    await signOut({ redirectTo: `/${locale}/login` });
  }

  const propertiesNav = await listAdminPropertiesNav(session.user.organizationId);

  return (
    <div className="min-h-screen bg-background">
      <StaffHeader
        locale={locale}
        organizationName={session.user.organizationName}
        userName={session.user.name ?? ""}
        logoutAction={logoutAction}
        propertiesNav={propertiesNav}
      />
      {children}
    </div>
  );
}
