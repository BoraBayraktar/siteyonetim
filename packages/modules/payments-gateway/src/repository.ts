import {
  PaymentIntentStatus,
  PaymentProvider,
  Prisma,
  prisma,
} from "@siteyonetim/db";

import type { PaymentGatewayContext, PropertyPaymentProfileDto } from "./contract";

function mapProfile(row: {
  propertyId: string;
  provider: PaymentProvider;
  enabled: boolean;
  apiKey: string | null;
  secretEnc: string | null;
  sandbox: boolean;
  defaultCashboxId: string | null;
}): PropertyPaymentProfileDto {
  return {
    propertyId: row.propertyId,
    provider: row.provider,
    enabled: row.enabled,
    apiKey: row.apiKey,
    sandbox: row.sandbox,
    defaultCashboxId: row.defaultCashboxId,
    hasSecret: Boolean(row.secretEnc),
  };
}

export class PaymentGatewayRepository {
  async assertProperty(organizationId: string, propertyId: string) {
    const row = await prisma.property.findFirst({
      where: { id: propertyId, organizationId, deleted: false },
      select: { id: true, name: true, organizationId: true },
    });
    return row;
  }

  async assertCashbox(ctx: PaymentGatewayContext, cashboxId: string) {
    return prisma.cashbox.findFirst({
      where: {
        id: cashboxId,
        organizationId: ctx.organizationId,
        propertyId: ctx.propertyId,
        deleted: false,
      },
      select: { id: true },
    });
  }

  async getProfile(ctx: PaymentGatewayContext): Promise<PropertyPaymentProfileDto | null> {
    const row = await prisma.propertyPaymentProfile.findFirst({
      where: { propertyId: ctx.propertyId, organizationId: ctx.organizationId, deleted: false },
    });
    return row ? mapProfile(row) : null;
  }

  async getProfileWithSecret(propertyId: string) {
    return prisma.propertyPaymentProfile.findFirst({
      where: { propertyId, deleted: false, enabled: true },
    });
  }

  async upsertProfile(
    ctx: PaymentGatewayContext,
    data: {
      enabled: boolean;
      apiKey: string;
      secretEnc?: string | null;
      sandbox: boolean;
      defaultCashboxId: string | null;
    },
  ) {
    const existing = await prisma.propertyPaymentProfile.findFirst({
      where: { propertyId: ctx.propertyId, deleted: false },
    });

    const saved = existing
      ? await prisma.propertyPaymentProfile.update({
          where: { id: existing.id },
          data: {
            enabled: data.enabled,
            apiKey: data.apiKey,
            sandbox: data.sandbox,
            defaultCashboxId: data.defaultCashboxId,
            ...(data.secretEnc ? { secretEnc: data.secretEnc } : {}),
          },
        })
      : await prisma.propertyPaymentProfile.create({
          data: {
            organizationId: ctx.organizationId,
            propertyId: ctx.propertyId,
            provider: PaymentProvider.IYZICO,
            enabled: data.enabled,
            apiKey: data.apiKey,
            secretEnc: data.secretEnc ?? null,
            sandbox: data.sandbox,
            defaultCashboxId: data.defaultCashboxId,
          },
        });

    return mapProfile(saved);
  }

  async getPortalSettingsAllowOnlinePayment(propertyId: string) {
    const tenant = await prisma.propertyTenant.findFirst({
      where: { propertyId, deleted: false },
      include: { portalSettings: true },
    });
    return tenant?.portalSettings?.allowOnlinePayment === true;
  }

  async resolvePartyForPortalUser(organizationId: string, portalUserId: string) {
    return prisma.party.findFirst({
      where: { organizationId, portalUserId, deleted: false },
      select: { id: true, displayName: true, email: true },
    });
  }

  async findPartyById(partyId: string, organizationId: string) {
    return prisma.party.findFirst({
      where: { id: partyId, organizationId, deleted: false },
      select: { id: true, displayName: true, email: true },
    });
  }

  async resolvePartyForUnit(propertyId: string, unitId: string) {
    const occupancy = await prisma.occupancy.findFirst({
      where: {
        unitId,
        deleted: false,
        endDate: null,
        unit: { propertyId, deleted: false },
      },
      orderBy: { startDate: "desc" },
      include: {
        party: { select: { id: true, displayName: true, email: true, organizationId: true } },
      },
    });
    return occupancy?.party ?? null;
  }

  async createIntent(data: {
    organizationId: string;
    propertyId: string;
    partyId: string;
    unitId?: string | null;
    amount: string;
    conversationId: string;
    locale: string;
    providerToken: string;
    expiresAt: Date;
  }) {
    return prisma.paymentIntent.create({
      data: {
        organizationId: data.organizationId,
        propertyId: data.propertyId,
        partyId: data.partyId,
        unitId: data.unitId ?? null,
        provider: PaymentProvider.IYZICO,
        status: PaymentIntentStatus.PENDING,
        amount: new Prisma.Decimal(data.amount),
        conversationId: data.conversationId,
        providerToken: data.providerToken,
        locale: data.locale,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findIntentByToken(token: string) {
    return prisma.paymentIntent.findFirst({
      where: { providerToken: token, deleted: false },
      include: { payment: { select: { id: true } } },
    });
  }

  async updateIntent(
    intentId: string,
    data: {
      status?: PaymentIntentStatus;
      providerPaymentId?: string | null;
      failureReason?: string | null;
    },
  ) {
    return prisma.paymentIntent.update({
      where: { id: intentId },
      data,
    });
  }
}
