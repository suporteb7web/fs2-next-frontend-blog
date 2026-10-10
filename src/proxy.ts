import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, isGuestPath, isProtectedPath, safeNextPath } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasToken = Boolean(request.cookies.get(AUTH_COOKIE_NAME)?.value);

  if (isProtectedPath(pathname) && !hasToken) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (isGuestPath(pathname) && hasToken) {
    const next = safeNextPath(request.nextUrl.searchParams.get("next"));
    return NextResponse.redirect(new URL(next, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/cadastro", "/posts/novo", "/posts/novo/:path*", "/posts/:id/editar"],
};
