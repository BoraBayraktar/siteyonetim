import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { AuditorLoginShell } from "@/components/auditor-login-shell";
import { auditorPortalPath, isAuditorRole } from "@/lib/auth-context";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AuditorLoginPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (session?.user?.sessionKind === "ADMIN" && isAuditorRole(session.user.role)) {
    redirect(auditorPortalPath(locale));
  }
  if (session?.user?.sessionKind === "ADMIN") {
    redirect(`/${locale}/login`);
  }
  if (session?.user?.sessionKind === "PORTAL") {
    redirect(`/${locale}/portal`);
  }

  return (
    <AuditorLoginShell locale={locale}>
      <AdminLoginForm
        locale={locale}
        redirectPath={auditorPortalPath(locale)}
        titleKey="auditorLoginTitle"
        embedded
      />
    </AuditorLoginShell>
  );
}
