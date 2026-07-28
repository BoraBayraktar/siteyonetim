import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginForm } from "@/components/login-form";

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
  if (session?.user?.sessionKind === "ADMIN") {
    redirect(`/${locale}/admin/properties`);
  }

  return (
    <main className="flex min-h-screen items-center px-4 py-12">
      <LoginForm
        locale={locale}
        redirectPath={`/${locale}/portal`}
        titleKey="portalLoginTitle"
      />
    </main>
  );
}
