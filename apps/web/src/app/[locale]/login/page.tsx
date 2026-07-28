import { setRequestLocale } from "next-intl/server";

import { LoginForm } from "@/components/login-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="flex min-h-screen items-center px-4 py-12">
      <LoginForm locale={locale} />
    </main>
  );
}
