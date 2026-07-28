import { getTranslations, setRequestLocale } from "next-intl/server";

import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function PortalLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  const tAuth = await getTranslations("auth");
  const tNav = await getTranslations("nav");

  const showHeader = session?.user?.sessionKind === "PORTAL";

  return (
    <div className="min-h-screen">
      {showHeader ? (
        <header className="border-b">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
            <p className="text-sm font-medium">{tNav("portal")}</p>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: `/${locale}/portal/login` });
              }}
            >
              <Button variant="outline" size="sm" type="submit">
                {tAuth("logout")}
              </Button>
            </form>
          </div>
        </header>
      ) : null}
      {children}
    </div>
  );
}
