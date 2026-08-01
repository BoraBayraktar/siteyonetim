import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/auth";
import { auditorPortalPath, isAuditorRole, resolveAccessiblePropertyIds } from "@/lib/auth-context";
import { getPropertyService } from "@/lib/services";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AuditorHomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    redirect(`/${locale}/auditor/login`);
  }
  if (!isAuditorRole(session.user.role)) {
    redirect(`/${locale}/login`);
  }

  const scope = await resolveAccessiblePropertyIds(session);

  const properties = await getPropertyService().list({
    organizationId: session.user.organizationId,
    page: 1,
    pageSize: 200,
    ...(scope && scope !== "ALL" ? { propertyIds: scope } : {}),
  });

  const t = await getTranslations("auditor");

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("propertiesTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {properties.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("propertiesEmpty")}</p>
          ) : (
            properties.items.map((property) => (
              <div key={property.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                <div>
                  <p className="font-medium">{property.name}</p>
                  {property.address ? (
                    <p className="text-sm text-muted-foreground">{property.address}</p>
                  ) : null}
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`${auditorPortalPath(locale)}/properties/${property.id}/reports`}>
                    {t("openReports")}
                  </Link>
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </main>
  );
}
