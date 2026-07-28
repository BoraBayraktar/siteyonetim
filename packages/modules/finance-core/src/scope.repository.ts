import { prisma } from "@siteyonetim/db";

export const notDeleted = { deleted: false };

export class FinanceScopeRepository {
  async assertProperty(organizationId: string, propertyId: string): Promise<boolean> {
    const count = await prisma.property.count({
      where: { id: propertyId, organizationId, ...notDeleted },
    });
    return count > 0;
  }
}
