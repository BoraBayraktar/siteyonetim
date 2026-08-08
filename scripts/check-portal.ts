import { prisma } from "@siteyonetim/db";

async function main() {
  const parties = await prisma.party.findMany({
    where: { portalUserId: { not: null }, deleted: false },
    take: 3,
    select: { id: true, displayName: true, portalUserId: true, email: true },
  });
  const users = await prisma.user.findMany({
    where: { deleted: false, organizations: { none: {} }, portalParty: { isNot: null } },
    take: 3,
    select: { id: true, email: true, name: true },
  });
  const tenants = await prisma.propertyTenant.findMany({
    where: { deleted: false },
    take: 2,
    select: { portalCode: true, propertyId: true },
  });
  const creds = await prisma.portalUnitCredential.findMany({
    where: { deleted: false },
    take: 2,
    select: { id: true, unitId: true },
  });

  console.log(JSON.stringify({ parties, users, tenants, credCount: creds.length }, null, 2));

  // Check payment tables exist
  try {
    await prisma.propertyPaymentProfile.count();
    console.log("propertyPaymentProfile: ok");
  } catch (e) {
    console.log("propertyPaymentProfile ERROR:", (e as Error).message);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
