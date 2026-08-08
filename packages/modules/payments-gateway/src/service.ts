import { PaymentChannel, PaymentIntentStatus } from "@siteyonetim/db";
import { createAuditService } from "@siteyonetim/platform-audit";
import { createDuesService, type DuesServiceContract } from "@siteyonetim/finance-dues";
import { randomBytes } from "node:crypto";

import { buildIyzicoBuyer, initializeIyzicoCheckout, retrieveIyzicoCheckout } from "./adapters/iyzico";
import type {
  CompleteCheckoutResult,
  PaymentGatewayContext,
  PaymentGatewayServiceContract,
  PropertyPaymentProfileDto,
  StartPortalCheckoutInput,
  StartPortalCheckoutResult,
  UpsertPaymentProfileInput,
} from "./contract";
import { PaymentGatewayRepository } from "./repository";
import { decryptPaymentSecret, encryptPaymentSecret } from "./secret-cipher";

function conversationId(): string {
  return `pi_${randomBytes(12).toString("hex")}`;
}

export class PaymentGatewayService implements PaymentGatewayServiceContract {
  constructor(
    private readonly repository = new PaymentGatewayRepository(),
    private readonly audit = createAuditService(),
    private readonly dues: DuesServiceContract = createDuesService(),
  ) {}

  private async assertContext(ctx: PaymentGatewayContext) {
    const property = await this.repository.assertProperty(ctx.organizationId, ctx.propertyId);
    if (!property) throw new Error("PROPERTY_NOT_FOUND");
    return property;
  }

  async getProfile(ctx: PaymentGatewayContext): Promise<PropertyPaymentProfileDto | null> {
    await this.assertContext(ctx);
    return this.repository.getProfile(ctx);
  }

  async upsertProfile(input: UpsertPaymentProfileInput): Promise<PropertyPaymentProfileDto> {
    await this.assertContext(input);

    if (input.enabled) {
      if (!input.apiKey.trim()) throw new Error("PAYMENT_API_KEY_REQUIRED");
      if (!input.defaultCashboxId) throw new Error("PAYMENT_CASHBOX_REQUIRED");
      const cashbox = await this.repository.assertCashbox(input, input.defaultCashboxId);
      if (!cashbox) throw new Error("CASHBOX_NOT_FOUND");
    }

    const existing = await this.repository.getProfileWithSecret(input.propertyId);
    const secretEnc =
      input.secretKey && input.secretKey.trim().length > 0
        ? encryptPaymentSecret(input.secretKey.trim())
        : undefined;

    if (input.enabled && !secretEnc && !existing?.secretEnc) {
      throw new Error("PAYMENT_SECRET_REQUIRED");
    }

    const saved = await this.repository.upsertProfile(input, {
      enabled: input.enabled,
      apiKey: input.apiKey.trim(),
      secretEnc,
      sandbox: input.sandbox,
      defaultCashboxId: input.defaultCashboxId,
    });

    await this.audit.record({
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "payment.profile.upsert",
      entityType: "PropertyPaymentProfile",
      entityId: input.propertyId,
      metadata: { enabled: input.enabled, sandbox: input.sandbox },
    });

    return saved;
  }

  async resolvePortalPayer(input: {
    organizationId: string;
    propertyId: string;
    portalUserId?: string | null;
    unitId?: string | null;
  }) {
    if (input.unitId) {
      const party = await this.repository.resolvePartyForUnit(input.propertyId, input.unitId);
      if (!party || party.organizationId !== input.organizationId) return null;
      return { partyId: party.id, partyName: party.displayName, partyEmail: party.email };
    }
    if (!input.portalUserId) return null;
    const party = await this.repository.resolvePartyForPortalUser(
      input.organizationId,
      input.portalUserId,
    );
    if (!party) return null;
    return { partyId: party.id, partyName: party.displayName, partyEmail: party.email };
  }

  async startPortalCheckout(input: StartPortalCheckoutInput): Promise<StartPortalCheckoutResult> {
    const property = await this.repository.assertProperty(input.organizationId, input.propertyId);
    if (!property) throw new Error("PROPERTY_NOT_FOUND");

    const allowOnline = await this.repository.getPortalSettingsAllowOnlinePayment(input.propertyId);
    if (!allowOnline) throw new Error("ONLINE_PAYMENT_DISABLED");

    const profile = await this.repository.getProfileWithSecret(input.propertyId);
    if (!profile?.enabled || !profile.apiKey || !profile.secretEnc || !profile.defaultCashboxId) {
      throw new Error("PAYMENT_PROFILE_NOT_CONFIGURED");
    }

    const amount =
      input.unitId != null
        ? await this.dues.getPortalOpenDebtForUnit(input.propertyId, input.unitId)
        : await this.dues.getPortalOpenDebtForPartyProperty(
            input.partyId,
            input.propertyId,
            input.unitId ?? null,
          );

    if (Number(amount) <= 0) throw new Error("NO_OPEN_DEBT");

    const party = await this.repository.findPartyById(input.partyId, input.organizationId);
    if (!party) throw new Error("PAYER_NOT_ALLOWED");

    const secretKey = decryptPaymentSecret(profile.secretEnc);
    const convId = conversationId();
    const callbackUrl = `${input.callbackBaseUrl}/api/payments/iyzico/callback?locale=${encodeURIComponent(input.locale)}`;
    const buyer = buildIyzicoBuyer({
      partyId: input.partyId,
      displayName: party.displayName,
      email: party.email,
      ip: "85.34.78.112",
    });

    const checkout = await initializeIyzicoCheckout(
      { apiKey: profile.apiKey, secretKey, sandbox: profile.sandbox },
      {
        conversationId: convId,
        amount,
        locale: input.locale,
        callbackUrl,
        buyer,
        basketId: convId,
        propertyName: property.name,
      },
    );

    const expiresAt = new Date(Date.now() + checkout.tokenExpireTime * 1000);
    const intent = await this.repository.createIntent({
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      partyId: input.partyId,
      unitId: input.unitId ?? null,
      amount,
      conversationId: convId,
      locale: input.locale,
      providerToken: checkout.token,
      expiresAt,
    });

    await this.audit.record({
      organizationId: input.organizationId,
      userId: null,
      action: "payment.online.initiated",
      entityType: "PaymentIntent",
      entityId: intent.id,
      metadata: { amount, propertyId: input.propertyId, partyId: input.partyId },
    });

    return { intentId: intent.id, paymentPageUrl: checkout.paymentPageUrl };
  }

  async completeCheckoutByToken(token: string, locale: string): Promise<CompleteCheckoutResult> {
    const intent = await this.repository.findIntentByToken(token);
    if (!intent) throw new Error("PAYMENT_INTENT_NOT_FOUND");

    if (intent.status === PaymentIntentStatus.SUCCEEDED && intent.payment?.id) {
      return {
        intentId: intent.id,
        status: "SUCCEEDED",
        paymentId: intent.payment.id,
      };
    }

    const profile = await this.repository.getProfileWithSecret(intent.propertyId);
    if (!profile?.apiKey || !profile.secretEnc || !profile.defaultCashboxId) {
      throw new Error("PAYMENT_PROFILE_NOT_CONFIGURED");
    }

    await this.repository.updateIntent(intent.id, { status: PaymentIntentStatus.PROCESSING });

    const secretKey = decryptPaymentSecret(profile.secretEnc);
    const retrieved = await retrieveIyzicoCheckout(
      { apiKey: profile.apiKey, secretKey, sandbox: profile.sandbox },
      token,
      locale || intent.locale,
    );

    if (retrieved.status !== "success" || retrieved.paymentStatus !== "SUCCESS") {
      const failureReason = retrieved.errorMessage ?? retrieved.paymentStatus ?? "PAYMENT_FAILED";
      await this.repository.updateIntent(intent.id, {
        status: PaymentIntentStatus.FAILED,
        failureReason,
      });

      await this.audit.record({
        organizationId: intent.organizationId,
        userId: null,
        action: "payment.online.failed",
        entityType: "PaymentIntent",
        entityId: intent.id,
        metadata: { failureReason },
      });

      return { intentId: intent.id, status: "FAILED", failureReason };
    }

    const paidAmount = retrieved.paidPrice ?? intent.amount.toString();
    const paymentResult = await this.dues.recordPayment({
      organizationId: intent.organizationId,
      propertyId: intent.propertyId,
      cashboxId: profile.defaultCashboxId,
      partyId: intent.partyId,
      unitId: intent.unitId,
      amount: paidAmount,
      channel: PaymentChannel.ONLINE,
      externalReference: retrieved.paymentId,
      paymentIntentId: intent.id,
      documentNo: retrieved.paymentId,
      description: "Online kart ödemesi",
      autoAllocate: true,
    });

    await this.repository.updateIntent(intent.id, {
      status: PaymentIntentStatus.SUCCEEDED,
      providerPaymentId: retrieved.paymentId,
      failureReason: null,
    });

    await this.audit.record({
      organizationId: intent.organizationId,
      userId: null,
      action: "payment.online.succeeded",
      entityType: "PaymentIntent",
      entityId: intent.id,
      metadata: { paymentId: paymentResult.paymentId, providerPaymentId: retrieved.paymentId },
    });

    return {
      intentId: intent.id,
      status: "SUCCEEDED",
      paymentId: paymentResult.paymentId,
    };
  }
}

export function createPaymentGatewayService() {
  return new PaymentGatewayService();
}
