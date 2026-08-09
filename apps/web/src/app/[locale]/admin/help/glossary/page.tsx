import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminSession } from "@/lib/cached-admin";

const TERM_KEYS = [
  "register",
  "accrual",
  "postAccrual",
  "draftAccrual",
  "account",
  "collection",
  "lateFee",
  "dues",
  "dashboard",
  "reports",
] as const;

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminGlossaryPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getAdminSession();
  if (!session?.user || session.user.sessionKind !== "ADMIN") {
    return null;
  }

  const t = await getTranslations("glossary");
  const tCommon = await getTranslations("common");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 px-0">
          <Link href={`/${locale}/admin/properties`}>← {tCommon("back")}</Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
      </div>

      <div className="space-y-4">
        {TERM_KEYS.map((key) => (
          <Card key={key} id={key}>
            <CardHeader>
              <CardTitle className="text-base">{t(`terms.${key}.title`)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t(`terms.${key}.body`)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
