import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import { esIdInvalido } from "./lib/rutas-invalidas";

/**
 * Sin cookie de sesión, toda página de portal redirige a /login (Brief 01). Es solo un filtro
 * rápido: la sesión y el acceso por membresía se verifican en el servidor de cada página y en
 * cada capacidad. API, acceso, assets y /ds (solo desarrollo) quedan fuera del matcher.
 */
export function proxy(request: NextRequest) {
  if (getSessionCookie(request, { cookiePrefix: "opai" })) {
    // Id que no es UUID: 404 real (con el shell) en vez de un 200 que luego dice «no encontrado».
    if (esIdInvalido(request.nextUrl.pathname)) {
      return NextResponse.rewrite(new URL("/no-encontrado", request.url), { status: 404 });
    }
    return NextResponse.next();
  }
  const login = new URL("/login", request.url);
  const destino = request.nextUrl.pathname + request.nextUrl.search;
  if (destino !== "/") login.searchParams.set("next", destino);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/((?!api|login|recuperar|invitacion|verificar|trabajador/login|cliente/login|ds|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
