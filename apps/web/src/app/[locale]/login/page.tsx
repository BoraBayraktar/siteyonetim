import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginForm } from "@/components/login-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (session?.user?.sessionKind === "ADMIN") {
    redirect(`/${locale}/admin/properties`);
  }
  if (session?.user?.sessionKind === "PORTAL") {
    redirect(`/${locale}/portal`);
  }

  return (
    <main className="flex min-h-screen items-center px-4 py-12">
      <LoginForm locale={locale} />
    </main>
  );
}
