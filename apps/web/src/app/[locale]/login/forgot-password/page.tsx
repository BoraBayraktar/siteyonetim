import { setRequestLocale } from "next-intl/server";

import { ForgotPasswordForm } from "@/components/forgot-password-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ForgotPasswordPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="flex min-h-screen items-center px-4 py-12">
      <ForgotPasswordForm locale={locale} />
    </main>
  );
}
