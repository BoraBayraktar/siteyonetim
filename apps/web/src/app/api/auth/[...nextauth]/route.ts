import "@/bootstrap-monorepo-env";

import type { NextRequest } from "next/server";

import { handlers } from "@/auth";
import { patchAuthSessionCookieExpiry } from "@/lib/auth-response-cookies";
import { assertAuthSecret } from "@/lib/auth-secret";

const secret = assertAuthSecret();

async function handleAuthRequest(req: NextRequest, method: "GET" | "POST") {
  const response = await handlers[method](req);
  return patchAuthSessionCookieExpiry(response, secret);
}

export async function GET(req: NextRequest) {
  return handleAuthRequest(req, "GET");
}

export async function POST(req: NextRequest) {
  return handleAuthRequest(req, "POST");
}
