import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { executeCapability, type Contexto, type Resultado } from "@opai/capabilities";
import { getSession } from "@opai/auth";

import { contextoDeIdentidad, identidadDe, type Identidad } from "./actor";
import { medirFase } from "./metricas-navegacion";
import { asegurarRegistro } from "./registro";
import { loginDe } from "./login-destino";
import { COOKIE_TENANT } from "./tenant-actual";
import { tieneAccesoAPortal } from "./acceso-portal";
import { estadoMfaDe, verificarMfaDe } from "./mfa";
import { contextoVerComo, verComoDe } from "./ver-como";
import type { VerComo } from "./ver-como-token";

export { tieneAccesoAPortal } from "./acceso-portal";

asegurarRegistro();

/** Identidad del request (una vez por render gracias a `cache`), o null sin sesión. */
export const identidadActual = cache(async (): Promise<Identidad | null> => {
  // Fases medidas para `Server-Timing` (ADR-045): `sesion` es la validación de Better Auth contra la
  // base; `identidad` son las membresías y los módulos activos del tenant elegido.
  const sesion = await medirFase("sesion", () => getSession());
  if (!sesion) return null;
  const tenant = (await cookies()).get(COOKIE_TENANT)?.value;
  const identidad = await medirFase("identidad", () => identidadDe(sesion.user, tenant));
  identidad.mfaVerificada = sesion.session.mfaVerified === true;
  return identidad;
});

/** Identidad o redirección al ingreso que corresponde (`/trabajador/login` o `/login`). */
export async function requerirIdentidad(destino?: string): Promise<Identidad> {
  const identidad = await identidadActual();
  if (!identidad) redirect(loginDe(destino));
  return identidad;
}

export function contextoServidor(identidad: Identidad, portal: string): Contexto {
  return contextoDeIdentidad(identidad, portal);
}

/** Como la persona vista, en solo lectura; quien mira también debe tener su segundo factor al día. */
async function ejecutarVerComo<T>(
  identidad: Identidad,
  verComo: VerComo,
  id: string,
  input: unknown,
  dryRun: boolean,
): Promise<Resultado<T>> {
  if (await verificarMfaDe(identidad))
    return { ok: false, error: { code: "FORBIDDEN", message: "Completa el segundo factor." } };
  const vista = await contextoVerComo(verComo, verComo.portal);
  if (!vista)
    return {
      ok: false,
      error: { code: "FORBIDDEN", message: "La vista «ver como» ya no está disponible." },
    };
  return (await executeCapability(vista, id, input, { dryRun })) as Resultado<T>;
}

/** Ejecuta una capacidad como el usuario del request (Server Components y Server Actions). */
export async function ejecutarComoUsuario<T = unknown>(
  portal: string,
  id: string,
  input: unknown = {},
  dryRun = false,
  idempotencyKey?: string,
): Promise<Resultado<T>> {
  const identidad = await identidadActual();
  if (!identidad)
    return { ok: false, error: { code: "UNAUTHENTICATED", message: "Inicia sesión." } };
  // «Ver como» (CAR-528): solo en el portal de la vista; el ERP, `/api/v1` y el MCP siguen con la identidad propia.
  const verComo = await verComoDe(identidad);
  if (verComo?.portal === portal) return ejecutarVerComo<T>(identidad, verComo, id, input, dryRun);
  if (!tieneAccesoAPortal(identidad, portal))
    return { ok: false, error: { code: "FORBIDDEN", message: "No tienes acceso a este portal." } };
  if (await verificarMfaDe(identidad))
    return { ok: false, error: { code: "FORBIDDEN", message: "Completa el segundo factor." } };
  const ctx = contextoServidor(identidad, portal);
  ctx.mfa = await estadoMfaDe(identidad);
  const r = await executeCapability(ctx, id, input, {
    dryRun,
    ...(idempotencyKey ? { idempotencyKey } : {}),
  });
  return r as Resultado<T>;
}
