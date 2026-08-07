import { decode } from "next-auth/jwt";

const SESSION_COOKIE_SUFFIX = "authjs.session-token";

type ParsedSetCookie = {
  name: string;
  value: string;
  options: {
    expires?: Date;
    maxAge?: number;
    httpOnly?: boolean;
    secure?: boolean;
    path?: string;
    sameSite?: "lax" | "strict" | "none";
  };
};

function isSessionCookieName(name: string): boolean {
  return (
    name === SESSION_COOKIE_SUFFIX ||
    name.startsWith(`${SESSION_COOKIE_SUFFIX}.`) ||
    name === `__Secure-${SESSION_COOKIE_SUFFIX}` ||
    name.startsWith(`__Secure-${SESSION_COOKIE_SUFFIX}.`)
  );
}

function sessionCookieBaseName(setCookieHeaders: string[]): string | null {
  for (const header of setCookieHeaders) {
    const name = header.split("=")[0]?.trim();
    if (!name || !isSessionCookieName(name)) {
      continue;
    }
    if (!name.includes(".")) {
      return name;
    }
    return name.split(".").slice(0, -1).join(".");
  }
  return null;
}

function serializeCookie(
  name: string,
  value: string,
  options: ParsedSetCookie["options"],
): string {
  const parts = [`${name}=${value}`];
  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }
  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }
  if (options.path) {
    parts.push(`Path=${options.path}`);
  }
  if (options.httpOnly) {
    parts.push("HttpOnly");
  }
  if (options.secure) {
    parts.push("Secure");
  }
  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite[0]?.toUpperCase()}${options.sameSite.slice(1)}`);
  }
  return parts.join("; ");
}

function extractSessionTokenValue(setCookieHeaders: string[], baseName: string): string | null {
  const chunks = setCookieHeaders
    .map((header) => {
      const name = header.split("=")[0]?.trim();
      if (!name || !name.startsWith(baseName)) {
        return null;
      }
      const value = header.slice(header.indexOf("=") + 1).split(";")[0];
      const index = name.includes(".") ? Number.parseInt(name.split(".").pop() ?? "0", 10) : 0;
      return { index, value };
    })
    .filter((chunk): chunk is { index: number; value: string } => chunk !== null);

  if (chunks.length === 0) {
    return null;
  }

  chunks.sort((a, b) => a.index - b.index);
  const token = chunks.map((chunk) => chunk.value).join("");
  return token || null;
}

function parseSetCookie(header: string): ParsedSetCookie {
  const nameValue = header.split(";")[0] ?? "";
  const eq = nameValue.indexOf("=");
  const name = nameValue.slice(0, eq);
  const value = nameValue.slice(eq + 1);
  const options: ParsedSetCookie["options"] = {};

  for (const part of header.split(";").slice(1)) {
    const trimmed = part.trim();
    const separator = trimmed.indexOf("=");
    const key = (separator === -1 ? trimmed : trimmed.slice(0, separator)).toLowerCase();
    const rawValue = separator === -1 ? "" : trimmed.slice(separator + 1);

    if (key === "expires") {
      options.expires = new Date(rawValue);
    } else if (key === "max-age") {
      options.maxAge = Number.parseInt(rawValue, 10);
    } else if (key === "httponly") {
      options.httpOnly = true;
    } else if (key === "secure") {
      options.secure = true;
    } else if (key === "path") {
      options.path = rawValue;
    } else if (key === "samesite") {
      options.sameSite = rawValue.toLowerCase() as ParsedSetCookie["options"]["sameSite"];
    }
  }

  return { name, value, options };
}

function remainingFromToken(payload: Record<string, unknown> | null): number | null {
  if (!payload) {
    return null;
  }
  if (typeof payload.absoluteExp === "number") {
    return Math.max(1, payload.absoluteExp - Math.floor(Date.now() / 1000));
  }
  if (typeof payload.sessionMaxAge === "number" && payload.sessionMaxAge > 0) {
    return payload.sessionMaxAge;
  }
  return null;
}

/**
 * Auth.js always derives cookie expiry from config.session.maxAge.
 * Align Set-Cookie Max-Age / Expires with remember-me aware JWT claims instead.
 */
export async function patchAuthSessionCookieExpiry(
  response: Response,
  secret: string,
): Promise<Response> {
  const getSetCookie = response.headers.getSetCookie?.bind(response.headers);
  if (!getSetCookie) {
    return response;
  }

  const setCookies = getSetCookie();
  if (setCookies.length === 0) {
    return response;
  }

  const baseName = sessionCookieBaseName(setCookies);
  if (!baseName) {
    return response;
  }

  const token = extractSessionTokenValue(setCookies, baseName);
  if (!token) {
    return response;
  }

  let payload: Record<string, unknown> | null = null;
  try {
    payload = (await decode({ token, secret, salt: baseName })) as Record<string, unknown> | null;
  } catch {
    return response;
  }

  const maxAge = remainingFromToken(payload);
  if (!maxAge) {
    return response;
  }

  const expires = new Date(Date.now() + maxAge * 1000);
  const headers = new Headers(response.headers);
  headers.delete("set-cookie");

  for (const header of setCookies) {
    const parsed = parseSetCookie(header);
    if (!parsed.name.startsWith(baseName) || !parsed.value) {
      headers.append("set-cookie", header);
      continue;
    }

    headers.append(
      "set-cookie",
      serializeCookie(parsed.name, parsed.value, {
        ...parsed.options,
        maxAge,
        expires,
        httpOnly: parsed.options.httpOnly ?? true,
        sameSite: parsed.options.sameSite ?? "lax",
        path: parsed.options.path ?? "/",
        secure: parsed.options.secure,
      }),
    );
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
