import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { emitirCodigoApp } from "@opai/auth";

import { COOKIE_RETO_APP, enlaceVueltaApp, esPrecargaVueltaApp } from "@/lib/canje-app";

/** Motivos de fallo al volver a la app nativa (sin datos sensibles). */
export type MotivoVolverApp = "sin_reto" | "emitir_rechazado";

/**
 * Ingreso con Google desde la app nativa (CAR-516, CAR-727): el toque en «Seguir en la app» debe ser
 * una navegación HTTP con 303 al esquema `cl.opai.app://`. Un redirect desde Server Action no lo
 * sigue bien SFSafariViewController.
 */
export async function GET(request: NextRequest) {
  if (esPrecargaVueltaApp(request.headers)) {
    return new NextResponse(null, { status: 204 });
  }
  const jarra = await cookies();
  const reto = jarra.get(COOKIE_RETO_APP)?.value;
  if (!reto) {
    console.warn("[app-nativa] volver_fallo", { motivo: "sin_reto" satisfies MotivoVolverApp });
    return NextResponse.redirect(new URL("/app/listo?error=1", request.url), 303);
  }
  const codigo = await emitirCodigoApp(reto);
  if (!codigo) {
    console.warn("[app-nativa] volver_fallo", {
      motivo: "emitir_rechazado" satisfies MotivoVolverApp,
    });
    return NextResponse.redirect(new URL("/app/listo?error=1", request.url), 303);
  }
  jarra.delete({ name: COOKIE_RETO_APP, path: "/app" });
  return NextResponse.redirect(enlaceVueltaApp(codigo), 303);
}