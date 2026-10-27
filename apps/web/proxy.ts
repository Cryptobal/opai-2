import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import { consultaDeRuta } from "./lib/existencia-ruta";
import { destino404, esIdInvalido } from "./lib/rutas-invalidas";

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
  // Marca de inicio del request para el `total` de `Server-Timing` (ADR-045): la página la lee en
  // `MarcadorMetricas`. Se toma en la primera línea —antes del posible lookup a `/api/existe`, que
  // en la carga de una ficha hace otra petición— para que el `total` incluya ese trabajo. Date.now()
  // (época) es comparable entre el proxy y el render.
  const t0 = Date.now();
  if (getSessionCookie(request, { cookiePrefix: "opai" })) {
    // La cabecera se fija en el servidor y sobrescribe cualquier `x-opai-t0` del cliente: en ninguna
    // rama (ni en el 404) se deja pasar la que mande el navegador.
    const headers = new Headers(request.headers);
    headers.set("x-opai-t0", String(t0));
    // Ficha que no existe: se reescribe a la página de 404 del portal (catch-all con `notFound()` sin
    // leer `params`, que ya responde HTTP 404 y con el shell). No se fuerza `status` aquí: un 404
    // puesto por el proxy puede terminar en la página genérica de Next, sin menú y en inglés.
    if (esIdInvalido(request.nextUrl.pathname) || (await noExiste(request))) {
      return NextResponse.rewrite(new URL(destino404(request.nextUrl.pathname), request.url), {
        request: { headers },
      });
    }
    return NextResponse.next({ request: { headers } });
  }
  const login = new URL("/login", request.url);
  const destino = request.nextUrl.pathname + request.nextUrl.search;
  if (destino !== "/") login.searchParams.set("next", destino);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/((?!api|login|mfa|recuperar|invitacion|verificar|trabajador/login|cliente/login|ds|manifest.webmanifest|sw.js|sin-conexion|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
