import { setRequestLocale } from "next-intl/server";

import { ResetPasswordForm } from "@/components/reset-password-form";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { token } = await searchParams;
  setRequestLocale(locale);

  return (
    <main className="flex min-h-screen items-center px-4 py-12">
      <ResetPasswordForm locale={locale} token={token ?? ""} />
    </main>
  );
}
