import bcrypt from "bcryptjs";
import { OrganizationRole, prisma } from "../src/index";

const DEMO_SLUG = "demo-yonetim";
const DEMO_EMAIL = "admin@demo.local";
const DEMO_PASSWORD = "Demo123!";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  await prisma.$transaction(async (tx) => {
    const org = await tx.organization.upsert({
      where: { slug: DEMO_SLUG },
      create: {
        name: "Demo Site Yönetimi",
        slug: DEMO_SLUG,
      },
      update: {},
    });

    const user = await tx.user.upsert({
      where: { email: DEMO_EMAIL },
      create: {
        email: DEMO_EMAIL,
        name: "Demo Yönetici",
        passwordHash,
      },
      update: {
        name: "Demo Yönetici",
        passwordHash,
        deleted: false,
        deletedDate: null,
        deletedUserId: null,
      },
    });

    await tx.userOrganization.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: org.id,
        },
      },
      create: {
        userId: user.id,
        organizationId: org.id,
        role: OrganizationRole.ORG_ADMIN,
      },
      update: {
        role: OrganizationRole.ORG_ADMIN,
      },
    });
  });

  console.log(`Demo admin ready: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
