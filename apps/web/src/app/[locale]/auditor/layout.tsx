import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { isAuditorRole } from "@/lib/auth-context";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AuditorLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  const tAuth = await getTranslations("auth");
  const tAuditor = await getTranslations("auditor");

  const showHeader =
    session?.user?.sessionKind === "ADMIN" && isAuditorRole(session.user.role);

  return (
    <div className="min-h-screen">
      {showHeader ? (
        <header className="border-b">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <div>
              <p className="text-sm font-medium">{tAuditor("title")}</p>
              <p className="text-xs text-muted-foreground">{tAuditor("readOnlyNotice")}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/${locale}/auditor/security`}>{tAuth("securityTitle")}</Link>
              </Button>
              <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: `/${locale}/auditor/login` });
              }}
            >
              <Button variant="outline" size="sm" type="submit">
                {tAuth("logout")}
              </Button>
            </form>
            </div>
          </div>
        </header>
      ) : null}
      {children}
    </div>
  );
}
