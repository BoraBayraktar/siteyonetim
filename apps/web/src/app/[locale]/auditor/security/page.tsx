import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { AdminSecurityPanel } from "@/components/admin-security-panel";
import { auth } from "@/auth";
import { auditorPortalPath, isAuditorRole } from "@/lib/auth-context";
import { getAuthService } from "@/lib/services";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AuditorSecurityPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN" || !isAuditorRole(session.user.role)) {
    redirect(`/${locale}/auditor/login`);
  }

  const status = await getAuthService().getTotpStatus(session.user.id, session.user.organizationId);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <AdminSecurityPanel
        locale={locale}
        totpEnabled={status.enabled}
        organizationRequiresTwoFactor={status.organizationRequiresTwoFactor}
        canManageOrgPolicy={false}
      />
    </div>
  );
}
