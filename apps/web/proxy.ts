import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import { consultaDeRuta } from "./lib/existencia-ruta";
import { destino404, esIdInvalido } from "./lib/rutas-invalidas";
import { cabecerasConNonce } from "./lib/nonce";

/** Carga completa del documento (no una navegación RSC del cliente, que no lee el estado HTTP). */
function esDocumento(request: NextRequest): boolean {
  return Boolean(request.headers.get("accept")?.includes("text/html")) && !request.headers.has("rsc");
}

/** Pregunta a `/api/existe` si la ficha o el slug existen; ante cualquier falla, que decida la página. */
async function noExiste(request: NextRequest): Promise<boolean> {
  const { pathname, origin } = request.nextUrl;
  if (!esDocumento(request) || !consultaDeRuta(pathname)) return false;
  try {
    const r = await fetch(`${origin}/api/existe?ruta=${encodeURIComponent(pathname)}`, {
      // Se reenvía la cookie para que `/api/existe` resuelva la sesión: el rate limit de esa ruta cuenta
      // por usuario, no por IP (el `fetch` interno sale con una sola IP de Vercel, y una cabecera de IP
      // sería falsificable por quien la golpee directo). NÚCLEO-B.
      headers: { cookie: request.headers.get("cookie") ?? "" },
      signal: AbortSignal.timeout(4000),
    });
    const d: { existe?: boolean } = r.ok ? await r.json() : {};
    return d.existe === false;
  } catch {
    return false;
  }
}

const CABECERAS_SIN_REENVIAR = ["content-length", "content-encoding", "transfer-encoding", "connection"];

/**
 * 404 real de una ficha/slug/grupo inexistente. Un `NextResponse.rewrite()` no cambia el estado HTTP
 * que ve el navegador: lo decide el render de la página de destino, y con `cacheComponents` esa
 * página cuelga del shell del portal (`PortalLayout`), que envía su `Suspense` estático en 200 antes
 * de que el `notFound()` del contenido se resuelva — sin esto, cualquier 404 del ERP queda en 200
 * (ver brief de Configuración §10 y `ESTADO.md`: no hay forma de desactivar esa franja estática
 * solo para el 404 sin tocar el shell de todas las páginas). Por eso para una carga completa de
 * documento se pide la página de destino con un `fetch` interno (misma sesión, vía cookie) y se
 * reenvía su cuerpo con el estado forzado a 404; una navegación RSC del cliente sigue con el
 * `rewrite` simple, que ya le basta (no lee el estado HTTP).
 */
async function respuesta404(request: NextRequest, headers: Headers): Promise<NextResponse> {
  const destino = new URL(destino404(request.nextUrl.pathname), request.url);
  if (!esDocumento(request)) return NextResponse.rewrite(destino, { request: { headers } });
  try {
    const r = await fetch(destino, {
      headers: { cookie: request.headers.get("cookie") ?? "" },
      signal: AbortSignal.timeout(4000),
    });
    const cuerpo = await r.arrayBuffer();
    const salida = new NextResponse(cuerpo, { status: 404 });
    for (const [clave, valor] of r.headers)
      if (!CABECERAS_SIN_REENVIAR.includes(clave)) salida.headers.set(clave, valor);
    return salida;
  } catch {
    return NextResponse.rewrite(destino, { request: { headers } });
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
  const { headers, csp } = cabecerasConNonce(request.headers);
  headers.set("x-opai-t0", String(t0));
  // URL pedida, sin `_rsc` ni `reintento`, para el «Reintentar» de `ErrorCarga` (CAR-50). La fija el
  // servidor y sobrescribe la que mande el navegador.
  const pedida = request.nextUrl.clone();
  pedida.searchParams.delete("_rsc");
  pedida.searchParams.delete("reintento");
  headers.set("x-opai-ruta", pedida.pathname + pedida.search);
  const responder = (r: NextResponse) => {
    r.headers.set("Content-Security-Policy", csp);
    return r;
  };
  // Antes estaban fuera del matcher; siguen públicas, pero ahora reciben nonce de servidor.
  const publica =
    /^\/(?:login|mfa|recuperar|invitacion|verificar|correccion|p|ds|sin-conexion)(?:\/|$)/.test(
      request.nextUrl.pathname,
    ) || ["/trabajador/login", "/cliente/login"].includes(request.nextUrl.pathname);
  if (publica) return responder(NextResponse.next({ request: { headers } }));
  if (getSessionCookie(request, { cookiePrefix: "opai" })) {
    // La cabecera se fija en el servidor y sobrescribe cualquier `x-opai-t0` del cliente: en ninguna
    // rama (ni en el 404) se deja pasar la que mande el navegador.
    // Ficha, grupo, evento o integración inexistente: 404 real con el shell del portal (`respuesta404`).
    if (esIdInvalido(request.nextUrl.pathname) || (await noExiste(request)))
      return responder(await respuesta404(request, headers));
    return responder(NextResponse.next({ request: { headers } }));
  }
  const login = new URL("/login", request.url);
  const destino = request.nextUrl.pathname + request.nextUrl.search;
  if (destino !== "/") login.searchParams.set("next", destino);
  return responder(NextResponse.redirect(login));
}

export const config = {
  matcher: [
    "/((?!api|manifest.webmanifest|sw.js|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
