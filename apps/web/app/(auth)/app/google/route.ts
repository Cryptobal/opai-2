import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { esRetoValido, googleHabilitado, urlDeGoogle } from "@opai/auth";

import { COOKIE_RETO_APP } from "@/lib/canje-app";

/**
 * Ingreso con Google desde la app nativa (CAR-516, Brief 17b), paso 1: corre en el navegador del
 * sistema. Guarda el reto PKCE de la app en una cookie de 10 minutos y manda a Google; Google vuelve
 * a `/app/listo`. Sin Google configurado o con un reto mal formado, va al ingreso de siempre.
 */
export async function GET(request: NextRequest) {
  const reto = request.nextUrl.searchParams.get("reto") ?? "";
  const url = googleHabilitado() && esRetoValido(reto) ? await urlDeGoogle("/app/listo") : null;
  if (!url) return NextResponse.redirect(new URL("/login", request.url));
  (await cookies()).set(COOKIE_RETO_APP, reto, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/app",
    maxAge: 600,
  });
  return NextResponse.redirect(url);
}
