"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { canjearCodigoApp } from "@opai/auth";

import { ipDeCabeceras, permitir } from "@/lib/rate-limit";

/**
 * Ingreso con Google desde la app nativa (CAR-516, Brief 17b). No son capacidades: abren una sesión.
 * - Volver a la app: ruta `GET /app/volver` (CAR-727), no Server Action.
 * - `accionCanjearApp` (dentro de la app): canjea código + verificador y entra. Tope por origen con
 *   fallo cerrado; el error es el mismo para un código inexistente, vencido, usado o mal verificado.
 */
export type EstadoCanje = { error: boolean };

export async function accionCanjearApp(codigo: string, verificador: string): Promise<EstadoCanje> {
  const origen = ipDeCabeceras(await headers());
  if (!(await permitir(`app-canje:${origen}`, 10, 15 * 60_000, { fallarCerrado: true }))) {
    return { error: true };
  }
  if (!(await canjearCodigoApp(codigo, verificador))) return { error: true };
  redirect("/entrar");
}
