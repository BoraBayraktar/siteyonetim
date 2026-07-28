import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Button } from "@/components/ui/button";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-4 py-16">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href={`/${locale}/admin/properties`}>{t("goAdmin")}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/${locale}/portal/login`}>{t("goPortalLogin")}</Link>
        </Button>
      </div>
    </main>
  );
}
