import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const locale =
    routing.locales.find((entry) => pathname === `/${entry}` || pathname.startsWith(`/${entry}/`)) ??
    routing.defaultLocale;

  const isAdmin = pathname.includes("/admin");
  const isPortalRoute = pathname.includes("/portal");
  const isPortalLogin = pathname.includes("/portal/login");
  const isAdminLogin = pathname.includes("/login") && !isPortalLogin;

  if (isAdmin && !request.auth) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  if (isAdmin && request.auth?.user?.sessionKind === "PORTAL") {
    return NextResponse.redirect(new URL(`/${locale}/portal`, request.url));
  }

  if (isPortalRoute && !isPortalLogin && !request.auth) {
    return NextResponse.redirect(new URL(`/${locale}/portal/login`, request.url));
  }

  if (isPortalRoute && !isPortalLogin && request.auth?.user?.sessionKind === "ADMIN") {
    return NextResponse.redirect(new URL(`/${locale}/admin/properties`, request.url));
  }

  if (isAdminLogin && request.auth?.user?.sessionKind === "ADMIN") {
    return NextResponse.redirect(new URL(`/${locale}/admin/properties`, request.url));
  }

  if (isPortalLogin && request.auth?.user?.sessionKind === "PORTAL") {
    return NextResponse.redirect(new URL(`/${locale}/portal`, request.url));
  }

  return intlMiddleware(request);
});

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
