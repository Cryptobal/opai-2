"use server";

import { revalidatePath } from "next/cache";

import { type Confirmacion, confirmarIdentidad, opcionesConfirmarConPasskey } from "@opai/auth";

import { verificarMfaDe } from "@/lib/mfa";
import { LIMITES, permitir } from "@/lib/rate-limit";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

/**
 * Mi cuenta › Seguridad (CAR-286). Renombrar y quitar invocan las capacidades
 * `core.metodos_acceso.*` (mismas herramientas que el MCP). Quitar confirma antes la identidad
 * (contraseña, código o passkey vigente): `@opai/auth` deja una marca de 5 minutos que la capacidad
 * consume en la transacción del cambio.
 */
export type ResultadoMetodo = { ok: true; aviso: string | null } | { ok: false; error: string };

export async function accionRenombrarPasskey(id: string, nombre: string): Promise<ResultadoMetodo> {
  const r = await ejecutarComoUsuario("erp", "core.metodos_acceso.renombrar_passkey", {
    id,
    nombre,
  });
  if (!r.ok) return { ok: false, error: r.error.message };
  revalidatePath("/mi-cuenta");
  return { ok: true, aviso: null };
}

/** Opciones para confirmar la identidad con una passkey propia (null si no tiene). */
export async function accionOpcionesConfirmarPasskey() {
  return opcionesConfirmarConPasskey();
}

export type Quitar = { metodo: "passkey"; id: string } | { metodo: "app_autenticadora" };

export async function accionQuitarMetodo(
  quitar: Quitar,
  confirmacion: Confirmacion,
): Promise<ResultadoMetodo> {
  const identidad = await identidadActual();
  if (!identidad) return { ok: false, error: "Inicia sesión." };
  // Antes de confirmar: así no queda una marca de confirmación viva si la capacidad iba a rechazar.
  if (await verificarMfaDe(identidad)) return { ok: false, error: "Completa el segundo factor." };
  const { maximo, ventanaMs } = LIMITES.confirmarIdentidad;
  if (!(await permitir(`confirmar-identidad:${identidad.usuario.id}`, maximo, ventanaMs)))
    return { ok: false, error: "Hubo demasiados intentos. Vuelve a intentarlo en unos minutos." };
  if (!(await confirmarIdentidad(confirmacion)))
    return {
      ok: false,
      error:
        confirmacion.tipo === "password"
          ? "La contraseña no es correcta."
          : confirmacion.tipo === "codigo"
            ? "El código no es correcto."
            : "No pudimos verificar la passkey.",
    };
  const r = await ejecutarComoUsuario<{ aviso: string | null }>(
    "erp",
    "core.metodos_acceso.quitar",
    quitar,
  );
  if (!r.ok) return { ok: false, error: r.error.message };
  revalidatePath("/mi-cuenta");
  return { ok: true, aviso: r.data.aviso };
}
