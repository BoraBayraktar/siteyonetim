import { createHmac } from "node:crypto";

const IYZI_WS_HEADER = "IYZWSv2";
const CHECKOUT_INIT_PATH = "/payment/iyzipos/checkoutform/initialize/auth/ecom";
const CHECKOUT_RETRIEVE_PATH = "/payment/iyzipos/checkoutform/auth/ecom/detail";

export type IyzicoCredentials = {
  apiKey: string;
  secretKey: string;
  sandbox: boolean;
};

function baseUrl(credentials: IyzicoCredentials): string {
  return credentials.sandbox ? "https://sandbox-api.iyzipay.com" : "https://api.iyzipay.com";
}

function formatPrice(price: string): string {
  const num = parseFloat(price);
  if (!Number.isFinite(num)) return price;
  const result = num.toString();
  return result.includes(".") ? result : `${result}.0`;
}

function randomKey(): string {
  return `${process.hrtime.bigint()}${Math.random().toString(36).slice(2)}`;
}

function signRequest(
  apiKey: string,
  secretKey: string,
  uri: string,
  body: Record<string, unknown>,
  rnd: string,
): string {
  const signature = createHmac("sha256", secretKey)
    .update(rnd + uri + JSON.stringify(body))
    .digest("hex");
  const authParams = `apiKey:${apiKey}&randomKey:${rnd}&signature:${signature}`;
  return `${IYZI_WS_HEADER} ${Buffer.from(authParams).toString("base64")}`;
}

async function iyzicoPost<T>(
  credentials: IyzicoCredentials,
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const rnd = randomKey();
  const authorization = signRequest(credentials.apiKey, credentials.secretKey, path, body, rnd);
  const response = await fetch(`${baseUrl(credentials)}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-iyzi-rnd": rnd,
      "x-iyzi-client-version": "siteyonetim-payments-gateway",
      Authorization: authorization,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`IYZICO_HTTP_${response.status}`);
  }

  return (await response.json()) as T;
}

export type IyzicoCheckoutInitResponse = {
  status: string;
  token?: string;
  paymentPageUrl?: string;
  tokenExpireTime?: number | string;
  errorMessage?: string;
};

export type IyzicoCheckoutRetrieveResponse = {
  status: string;
  paymentStatus?: string;
  paymentId?: string | number;
  paidPrice?: string | number;
  errorMessage?: string;
  fraudStatus?: number;
};

export async function postCheckoutInitialize(
  credentials: IyzicoCredentials,
  body: Record<string, unknown>,
): Promise<IyzicoCheckoutInitResponse> {
  return iyzicoPost(credentials, CHECKOUT_INIT_PATH, body);
}

export async function postCheckoutRetrieve(
  credentials: IyzicoCredentials,
  body: Record<string, unknown>,
): Promise<IyzicoCheckoutRetrieveResponse> {
  return iyzicoPost(credentials, CHECKOUT_RETRIEVE_PATH, body);
}

export { formatPrice };
