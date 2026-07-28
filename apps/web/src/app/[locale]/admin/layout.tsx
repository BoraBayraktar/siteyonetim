import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  const t = await getTranslations("nav");
  const tAuth = await getTranslations("auth");

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">{session?.user?.organizationName}</p>
            <p className="text-xs text-muted-foreground">{session?.user?.name}</p>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/${locale}/admin/properties`}>{t("properties")}</Link>
            </Button>
            <Separator orientation="vertical" className="hidden h-6 sm:block" />
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: `/${locale}` });
              }}
            >
              <Button variant="outline" size="sm" type="submit">
                {tAuth("logout")}
              </Button>
            </form>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
