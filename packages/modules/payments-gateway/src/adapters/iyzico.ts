import {
  formatPrice,
  postCheckoutInitialize,
  postCheckoutRetrieve,
  type IyzicoCredentials,
} from "./iyzico-client";

export type { IyzicoCredentials };

export type IyzicoCheckoutBuyer = {
  id: string;
  name: string;
  surname: string;
  email: string;
  identityNumber: string;
  gsmNumber: string;
  registrationAddress: string;
  city: string;
  country: string;
  ip: string;
};

export type InitializeCheckoutInput = {
  conversationId: string;
  amount: string;
  locale: string;
  callbackUrl: string;
  buyer: IyzicoCheckoutBuyer;
  basketId: string;
  propertyName: string;
};

export type InitializeCheckoutResult = {
  token: string;
  paymentPageUrl: string;
  tokenExpireTime: number;
};

export type RetrieveCheckoutResult = {
  status: "success" | "failure";
  paymentStatus: string;
  paymentId: string | null;
  paidPrice: string | null;
  errorMessage: string | null;
  fraudStatus: number | null;
};

function splitName(displayName: string): { name: string; surname: string } {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { name: "Malik", surname: "Portal" };
  if (parts.length === 1) return { name: parts[0]!, surname: "Portal" };
  return { name: parts[0]!, surname: parts.slice(1).join(" ") };
}

export function buildIyzicoBuyer(input: {
  partyId: string;
  displayName: string;
  email: string | null;
  ip: string;
}): IyzicoCheckoutBuyer {
  const { name, surname } = splitName(input.displayName);
  return {
    id: input.partyId,
    name,
    surname,
    email: input.email ?? "portal@example.com",
    identityNumber: "11111111111",
    gsmNumber: "+905555555555",
    registrationAddress: "Site yönetimi portal ödemesi",
    city: "Istanbul",
    country: "Turkey",
    ip: input.ip,
  };
}

export async function initializeIyzicoCheckout(
  credentials: IyzicoCredentials,
  input: InitializeCheckoutInput,
): Promise<InitializeCheckoutResult> {
  const buyer = input.buyer;
  const address = {
    contactName: `${buyer.name} ${buyer.surname}`,
    city: buyer.city,
    country: buyer.country,
    address: buyer.registrationAddress,
  };
  const formattedAmount = formatPrice(input.amount);

  const body = {
    locale: input.locale === "tr" ? "tr" : "en",
    conversationId: input.conversationId,
    price: formattedAmount,
    paidPrice: formattedAmount,
    currency: "TRY",
    basketId: input.basketId,
    paymentGroup: "PRODUCT",
    callbackUrl: input.callbackUrl,
    enabledInstallments: [1],
    buyer: {
      id: buyer.id,
      name: buyer.name,
      surname: buyer.surname,
      identityNumber: buyer.identityNumber,
      email: buyer.email,
      gsmNumber: buyer.gsmNumber,
      registrationAddress: buyer.registrationAddress,
      city: buyer.city,
      country: buyer.country,
      ip: buyer.ip,
    },
    shippingAddress: address,
    billingAddress: address,
    basketItems: [
      {
        id: input.basketId,
        name: input.propertyName,
        category1: "Aidat",
        itemType: "VIRTUAL",
        price: formattedAmount,
      },
    ],
  };

  const result = await postCheckoutInitialize(credentials, body);
  if (result.status !== "success" || !result.token || !result.paymentPageUrl) {
    throw new Error(result.errorMessage ?? "IYZICO_CHECKOUT_INIT_FAILED");
  }

  return {
    token: result.token,
    paymentPageUrl: result.paymentPageUrl,
    tokenExpireTime: Number(result.tokenExpireTime ?? 1800),
  };
}

export async function retrieveIyzicoCheckout(
  credentials: IyzicoCredentials,
  token: string,
  locale: string,
): Promise<RetrieveCheckoutResult> {
  const body = {
    locale: locale === "tr" ? "tr" : "en",
    conversationId: token,
    token,
  };

  const result = await postCheckoutRetrieve(credentials, body);
  return {
    status: result.status === "success" ? "success" : "failure",
    paymentStatus: String(result.paymentStatus ?? ""),
    paymentId: result.paymentId != null ? String(result.paymentId) : null,
    paidPrice: result.paidPrice != null ? String(result.paidPrice) : null,
    errorMessage: result.errorMessage ? String(result.errorMessage) : null,
    fraudStatus: result.fraudStatus != null ? Number(result.fraudStatus) : null,
  };
}
