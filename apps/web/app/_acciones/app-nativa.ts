"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { canjearCodigoApp, emitirCodigoApp } from "@opai/auth";

import { COOKIE_RETO_APP, enlaceVueltaApp } from "@/lib/canje-app";
import { ipDeCabeceras, permitir } from "@/lib/rate-limit";

/**
 * Ingreso con Google desde la app nativa (CAR-516, Brief 17b). No son capacidades: abren una sesión.
 * - `accionVolverALaApp` (navegador del sistema): emite el código atado al reto y vuelve a la app.
 * - `accionCanjearApp` (dentro de la app): canjea código + verificador y entra. Tope por origen con
 *   fallo cerrado; el error es el mismo para un código inexistente, vencido, usado o mal verificado.
 */
export async function accionVolverALaApp(): Promise<void> {
  const jarra = await cookies();
  const reto = jarra.get(COOKIE_RETO_APP)?.value;
  const codigo = reto ? await emitirCodigoApp(reto) : null;
  if (!codigo) redirect("/app/listo?error=1");
  jarra.delete({ name: COOKIE_RETO_APP, path: "/app" });
  redirect(enlaceVueltaApp(codigo));
}

export type EstadoCanje = { error: boolean };

export async function accionCanjearApp(codigo: string, verificador: string): Promise<EstadoCanje> {
  const origen = ipDeCabeceras(await headers());
  if (!(await permitir(`app-canje:${origen}`, 10, 15 * 60_000, { fallarCerrado: true }))) {
    return { error: true };
  }
  if (!(await canjearCodigoApp(codigo, verificador))) return { error: true };
  redirect("/entrar");
}
