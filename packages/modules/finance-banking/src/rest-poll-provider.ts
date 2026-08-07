import { parseBankWebhookPayload } from "./webhook-payload";

const FETCH_TIMEOUT_MS = 30_000;

export async function fetchRestPollPayload(pollUrl: string, bearerToken: string): Promise<unknown> {
  const url = pollUrl.trim();
  if (!url.startsWith("https://")) {
    throw new Error("BANK_POLL_URL_INVALID");
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error("BANK_POLL_FETCH_FAILED");
  }

  return response.json();
}

export async function fetchRestPollLines(pollUrl: string, bearerToken: string) {
  const body = await fetchRestPollPayload(pollUrl, bearerToken);
  return parseBankWebhookPayload(body);
}
