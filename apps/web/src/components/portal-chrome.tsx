import { Building2 } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type Props = {
  locale: string;
  userName: string;
  organizationName?: string | null;
};

export async function PortalChrome({ locale, userName, organizationName }: Props) {
  const tAuth = await getTranslations("auth");
  const tPortal = await getTranslations("portal");

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Building2 className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">{tPortal("brandTitle")}</p>
            <p className="truncate text-xs text-muted-foreground">
              {organizationName ?? tPortal("brandSubtitle")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <p className="hidden max-w-[180px] truncate text-sm text-muted-foreground sm:block">{userName}</p>
          <Separator orientation="vertical" className="hidden h-5 sm:block" />
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/${locale}`}>{tPortal("backToHome")}</Link>
          </Button>
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
      </div>
    </header>
  );
}
