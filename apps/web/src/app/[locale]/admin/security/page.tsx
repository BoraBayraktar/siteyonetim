import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { AdminSecurityPanel } from "@/components/admin-security-panel";
import { getAdminSession } from "@/lib/cached-admin";
import { canManageOrgUsers } from "@/lib/auth-context";
import { getAuthService } from "@/lib/services";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminSecurityPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getAdminSession();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    redirect(`/${locale}/login`);
  }

  const status = await getAuthService().getTotpStatus(session.user.id, session.user.organizationId);

  return (
    <AdminSecurityPanel
      locale={locale}
      totpEnabled={status.enabled}
      organizationRequiresTwoFactor={status.organizationRequiresTwoFactor}
      canManageOrgPolicy={canManageOrgUsers(session)}
    />
  );
}
