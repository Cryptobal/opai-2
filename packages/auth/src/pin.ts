import { APIError } from "better-auth/api";
import { headers as cabeceras } from "next/headers";

import { auth } from "./auth";
import { verificarRutYPin } from "./pin-verificacion";

/**
 * Ingreso con RUT + PIN de 6 dígitos (CAR-78 · B1, D-02), por el principal «persona» (ADR-033). Es un
 * mecanismo secundario: la sesión es una sesión normal de Better Auth del usuario vinculado a la
 * persona, abierta por el endpoint solo-servidor de `sesion-pin.ts`. Lo que cuida:
 *
 * - Sin enumeración: RUT inexistente, sin PIN, PIN incorrecto, persona sin usuario, portal no admitido
 *   y credencial bloqueada devuelven lo mismo (`credenciales`); el RUT inexistente igual gasta un hash.
 * - Solo entra quien únicamente tiene portales de Trabajador o Terreno en esa empresa: un PIN de 6
 *   dígitos no abre el ERP, Supervisor ni Plataforma, ni salta el segundo factor de nadie.
 * - Bloqueo por credencial tras N intentos (5 durante 15 min por defecto; ajustes del núcleo), con la
 *   cuenta y el rastro de seguridad (`seguridad.pin.*`) en la misma transacción.
 * - El tope por RUT y por origen (rate limit cerrado) lo aplica quien llama, en `apps/web`.
 */
export type ResultadoPin =
  { ok: true; debeCambiar: boolean } | { ok: false; fallo: "credenciales" };

const FALLO: ResultadoPin = { ok: false, fallo: "credenciales" };

/**
 * Verifica RUT + PIN y, si son correctos, abre la sesión del usuario de la persona (cookies por
 * `nextCookies`). Devuelve `credenciales` ante cualquier problema, sin distinguir la causa.
 */
export async function entrarConPin(rutEntrada: string, pin: string): Promise<ResultadoPin> {
  const h = await cabeceras();
  const ok = await verificarRutYPin(rutEntrada, pin, h);
  if (!ok) return FALLO;
  try {
    await auth.api.abrirSesionPin({ body: { userId: ok.userId }, headers: h });
  } catch (error) {
    if (error instanceof APIError) return FALLO;
    throw error;
  }
  return { ok: true, debeCambiar: ok.debeCambiar };
}
