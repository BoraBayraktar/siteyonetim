import type { PaymentProvider } from "@siteyonetim/db";

export type PaymentGatewayContext = {
  organizationId: string;
  propertyId: string;
  actorUserId?: string | null;
};

export type PropertyPaymentProfileDto = {
  propertyId: string;
  provider: PaymentProvider;
  enabled: boolean;
  apiKey: string | null;
  sandbox: boolean;
  defaultCashboxId: string | null;
  hasSecret: boolean;
};

export type UpsertPaymentProfileInput = PaymentGatewayContext & {
  enabled: boolean;
  apiKey: string;
  secretKey?: string | null;
  sandbox: boolean;
  defaultCashboxId: string | null;
};

export type StartPortalCheckoutInput = {
  organizationId: string;
  propertyId: string;
  partyId: string;
  unitId?: string | null;
  locale: string;
  callbackBaseUrl: string;
};

export type StartPortalCheckoutResult = {
  intentId: string;
  paymentPageUrl: string;
};

export type CompleteCheckoutResult = {
  intentId: string;
  status: "SUCCEEDED" | "FAILED" | "PENDING";
  paymentId?: string;
  failureReason?: string | null;
};

export interface PaymentGatewayServiceContract {
  getProfile(ctx: PaymentGatewayContext): Promise<PropertyPaymentProfileDto | null>;
  upsertProfile(input: UpsertPaymentProfileInput): Promise<PropertyPaymentProfileDto>;
  startPortalCheckout(input: StartPortalCheckoutInput): Promise<StartPortalCheckoutResult>;
  completeCheckoutByToken(token: string, locale: string): Promise<CompleteCheckoutResult>;
  resolvePortalPayer(input: {
    organizationId: string;
    propertyId: string;
    portalUserId?: string | null;
    unitId?: string | null;
  }): Promise<{ partyId: string; partyName: string; partyEmail: string | null } | null>;
}
