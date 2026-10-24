import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import { consultaDeRuta } from "./lib/existencia-ruta";
import { esIdInvalido } from "./lib/rutas-invalidas";

/** Pregunta a `/api/existe` si la ficha o el slug existen; ante cualquier falla, que decida la página. */
async function noExiste(request: NextRequest): Promise<boolean> {
  const { pathname, origin } = request.nextUrl;
  // Solo la carga completa del documento: la navegación del cliente (RSC) no lee el estado HTTP.
  const documento =
    request.headers.get("accept")?.includes("text/html") && !request.headers.has("rsc");
  if (!documento || !consultaDeRuta(pathname)) return false;
  try {
    const r = await fetch(`${origin}/api/existe?ruta=${encodeURIComponent(pathname)}`, {
      headers: { cookie: request.headers.get("cookie") ?? "" },
      signal: AbortSignal.timeout(4000),
    });
    const d: { existe?: boolean } = r.ok ? await r.json() : {};
    return d.existe === false;
  } catch {
    return false;
  }
}

/**
 * Sin cookie de sesión, toda página de portal redirige a /login (Brief 01). Es solo un filtro
 * rápido: la sesión y el acceso por membresía se verifican en el servidor de cada página y en
 * cada capacidad. API, acceso, assets y /ds (solo desarrollo) quedan fuera del matcher.
 */
export async function proxy(request: NextRequest) {
  if (getSessionCookie(request, { cookiePrefix: "opai" })) {
    // Id que no es UUID: 404 real (con el shell) en vez de un 200 que luego dice «no encontrado».
    if (esIdInvalido(request.nextUrl.pathname) || (await noExiste(request))) {
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
