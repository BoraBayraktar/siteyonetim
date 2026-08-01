import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { OrgUsersPanel } from "@/components/org-users-panel";
import { getAdminSession } from "@/lib/cached-admin";
import { canManageOrgUsers } from "@/lib/auth-context";
import { getPropertyRbacService } from "@/lib/services";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function OrgUsersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getAdminSession();
  if (!canManageOrgUsers(session) || !session?.user?.organizationId) {
    redirect(`/${locale}/admin/properties`);
  }

  const rbac = getPropertyRbacService();
  const [users, properties] = await Promise.all([
    rbac.listOrgUsers({ organizationId: session.user.organizationId }),
    rbac.listOrgPropertyOptions(session.user.organizationId),
  ]);

  return (
    <div className="space-y-6">
      <OrgUsersPanel
        locale={locale}
        users={users}
        properties={properties}
        currentUserId={session.user.id}
      />
    </div>
  );
}
