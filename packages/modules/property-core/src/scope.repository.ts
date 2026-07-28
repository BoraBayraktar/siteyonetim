import { prisma } from "@siteyonetim/db";

const notDeleted = { deleted: false };

export class PropertyScopeRepository {
  async assertPropertyInOrganization(organizationId: string, propertyId: string): Promise<boolean> {
    const count = await prisma.property.count({
      where: {
        id: propertyId,
        organizationId,
        ...notDeleted,
      },
    });
    return count > 0;
  }

  async assertBlockInOrganization(organizationId: string, blockId: string): Promise<boolean> {
    const count = await prisma.block.count({
      where: {
        id: blockId,
        deleted: false,
        property: {
          organizationId,
          deleted: false,
        },
      },
    });
    return count > 0;
  }
}

export { notDeleted };
