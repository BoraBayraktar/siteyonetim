import bcrypt from "bcryptjs";
import { OrganizationRole, prisma } from "../src/index";

const DEMO_SLUG = "demo-yonetim";
const DEMO_EMAIL = "admin@demo.local";
const DEMO_PASSWORD = "Demo123!";
const DEMO_AUDITOR_EMAIL = "denetci@demo.local";
const DEMO_AUDITOR_PASSWORD = "Demo123!";

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

    const auditor = await tx.user.upsert({
      where: { email: DEMO_AUDITOR_EMAIL },
      create: {
        email: DEMO_AUDITOR_EMAIL,
        name: "Demo Denetci",
        passwordHash,
      },
      update: {
        name: "Demo Denetci",
        passwordHash,
        deleted: false,
        deletedDate: null,
        deletedUserId: null,
      },
    });

    await tx.userOrganization.upsert({
      where: {
        userId_organizationId: {
          userId: auditor.id,
          organizationId: org.id,
        },
      },
      create: {
        userId: auditor.id,
        organizationId: org.id,
        role: OrganizationRole.AUDITOR,
      },
      update: {
        role: OrganizationRole.AUDITOR,
      },
    });

    const properties = await tx.property.findMany({
      where: { organizationId: org.id, deleted: false },
      select: { id: true, name: true },
    });

    for (const property of properties) {
      const tenant = await tx.propertyTenant.upsert({
        where: { propertyId: property.id },
        create: {
          propertyId: property.id,
          organizationId: org.id,
          portalCode: `DEMO-${property.id.slice(-6).toUpperCase()}`,
        },
        update: {},
      });

      await tx.propertyPortalSettings.upsert({
        where: { propertyTenantId: tenant.id },
        create: { propertyTenantId: tenant.id },
        update: {},
      });

      await tx.userPropertyAccess.upsert({
        where: {
          userId_propertyId: {
            userId: auditor.id,
            propertyId: property.id,
          },
        },
        create: {
          userId: auditor.id,
          organizationId: org.id,
          propertyId: property.id,
          role: "PROPERTY_AUDITOR",
        },
        update: {
          role: "PROPERTY_AUDITOR",
          deleted: false,
          deletedDate: null,
          deletedUserId: null,
        },
      });
    }
  });

  console.log(`Demo admin ready: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`Demo auditor ready: ${DEMO_AUDITOR_EMAIL} / ${DEMO_AUDITOR_PASSWORD}`);
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
