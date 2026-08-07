import Link from "next/link";
import { PropertyKind } from "@siteyonetim/db";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { getAdminSession } from "@/lib/cached-admin";
import { isStaffRole, resolveAccessiblePropertyIds } from "@/lib/auth-context";
import { staffPropertyHomePath } from "@/lib/staff-admin-access";
import { CreatePropertyForm } from "@/components/create-property-form";
import { ServerPagination } from "@/components/server-pagination";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { getPropertyService } from "@/lib/services";

const PAGE_SIZE = 10;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
};

function kindLabel(kind: PropertyKind, t: Awaited<ReturnType<typeof getTranslations>>) {
  if (kind === PropertyKind.APARTMAN_SITE) {
    return t("kindApartmentSite");
  }
  return t("kindApartment");
}

export default async function PropertiesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { page: pageParam } = await searchParams;
  setRequestLocale(locale);

  const session = await getAdminSession();
  if (!session?.user?.organizationId || session.user.sessionKind !== "ADMIN") {
    redirect(`/${locale}/login`);
  }

  const isStaffUser = isStaffRole(session.user.role);
  const page = Math.max(1, Number(pageParam ?? "1") || 1);
  const t = await getTranslations("properties");
  const scope = await resolveAccessiblePropertyIds(session);

  const data = await getPropertyService().list({
    organizationId: session.user.organizationId,
    page,
    pageSize: PAGE_SIZE,
    ...(scope && scope !== "ALL" ? { propertyIds: scope } : {}),
  });

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </div>
        {!isStaffUser ? <CreatePropertyForm /> : null}
      </CardHeader>
      <CardContent className="space-y-6">
          {data.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("kind")}</TableHead>
                  <TableHead>{t("address")}</TableHead>
                  <TableHead className="text-right">{t("blocks")}</TableHead>
                  <TableHead className="text-right">{t("units")}</TableHead>
                  <TableHead>{t("openDetail")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((property) => {
                  const detailHref = isStaffUser
                    ? staffPropertyHomePath(locale, property.id)
                    : `/${locale}/admin/properties/${property.id}/dashboard`;

                  return (
                  <TableRow key={property.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={detailHref}
                        className="underline-offset-4 hover:underline"
                      >
                        {property.name}
                      </Link>
                    </TableCell>
                    <TableCell>{kindLabel(property.kind, t)}</TableCell>
                    <TableCell>{property.address ?? "—"}</TableCell>
                    <TableCell className="text-right">{property.blockCount}</TableCell>
                    <TableCell className="text-right">{property.unitCount}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={detailHref}>{t("openDetail")}</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <ServerPagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            basePath="/admin/properties"
            locale={locale}
          />
        </CardContent>
      </Card>
  );
}
