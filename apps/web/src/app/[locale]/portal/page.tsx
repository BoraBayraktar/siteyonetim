import { OccupancyRole } from "@siteyonetim/db";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDuesService, getOccupancyService } from "@/lib/services";

type Props = {
  params: Promise<{ locale: string }>;
};

function money(value: string, locale: string) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: "TRY",
  }).format(Number(value));
}

export default async function PortalPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) {
    redirect(`/${locale}/portal/login`);
  }
  if (session.user.sessionKind !== "PORTAL") {
    redirect(`/${locale}/admin/properties`);
  }

  const t = await getTranslations("portal");
  const dues = getDuesService();

  const [units, openDebt, statement] = await Promise.all([
    getOccupancyService().listForPortalUser(session.user.id),
    dues.getPortalOpenDebt(session.user.id),
    dues.getPortalStatement(session.user.id),
  ]);

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>
            {t("welcome")}, {session.user.name}
          </CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            {t("openDebt")}: <span className="font-semibold">{money(openDebt, locale)}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("unitsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {units.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("emptyUnits")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("property")}</TableHead>
                  <TableHead>{t("unitCode")}</TableHead>
                  <TableHead>{t("role")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map((row) => (
                  <TableRow key={row.occupancyId}>
                    <TableCell>{row.propertyName}</TableCell>
                    <TableCell className="font-medium">{row.unitCode}</TableCell>
                    <TableCell>{row.role === OccupancyRole.OWNER ? t("roleOwner") : t("roleTenant")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("statementTitle")}</CardTitle>
          <CardDescription>{t("statementSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {statement.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("statementEmpty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("statementDate")}</TableHead>
                  <TableHead>{t("statementLabel")}</TableHead>
                  <TableHead>{t("statementDebit")}</TableHead>
                  <TableHead>{t("statementCredit")}</TableHead>
                  <TableHead>{t("statementBalance")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statement.map((row, index) => (
                  <TableRow key={`${row.kind}-${index}`}>
                    <TableCell>{row.date.toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US")}</TableCell>
                    <TableCell>{row.label}</TableCell>
                    <TableCell>{row.debit !== "0" ? money(row.debit, locale) : "—"}</TableCell>
                    <TableCell>{row.credit !== "0" ? money(row.credit, locale) : "—"}</TableCell>
                    <TableCell>{money(row.balance, locale)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
