"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  entrarConPasskey,
  guardarPasskey,
  opcionesEntrarConPasskey,
  opcionesNuevaPasskey,
  requireSession,
} from "@opai/auth";

import { destinoSeguro } from "@/app/(auth)/destino";
import { ipDeCabeceras, LIMITES, permitir } from "@/lib/rate-limit";

/**
 * Passkeys (CAR-286) por Server Actions (ADR-037): el servidor arma y verifica la ceremonia WebAuthn
 * con `@opai/auth`; el navegador solo usa `navigator.credentials`. Identidad: no son datos de negocio
 * ni algo que un agente pueda hacer (exigen el dispositivo de la persona).
 */
const PAUSA = "Hubo demasiados intentos. Vuelve a intentarlo en unos minutos.";

async function permitirPorIp(): Promise<boolean> {
  const ip = ipDeCabeceras(await headers());
  const { maximo, ventanaMs } = LIMITES.passkey;
  return permitir(`passkey-ip:${ip}`, maximo, ventanaMs);
}

/** Opciones para registrar una passkey en la cuenta con sesión. */
export async function accionOpcionesNuevaPasskey() {
  await requireSession();
  return opcionesNuevaPasskey();
}

/** Guarda la passkey verificada con su nombre. */
export async function accionGuardarPasskey(respuesta: unknown, nombre: string) {
  await requireSession();
  return guardarPasskey(respuesta, nombre);
}

/** Opciones para entrar con passkey (público, con límite por IP). */
export async function accionOpcionesEntrarPasskey() {
  if (!(await permitirPorIp())) return { ok: false as const, mensaje: PAUSA };
  return { ok: true as const, opciones: await opcionesEntrarConPasskey() };
}

/** Entra con passkey y sigue al selector de empresa (o al destino). */
export async function accionEntrarConPasskey(
  destino: string,
  respuesta: unknown,
): Promise<{ ok: false; mensaje: string }> {
  if (!(await permitirPorIp())) return { ok: false, mensaje: PAUSA };
  const r = await entrarConPasskey(respuesta);
  if (!r.ok) return { ok: false, mensaje: r.mensaje };
  redirect(
    destino
      ? `/elegir-empresa?next=${encodeURIComponent(destinoSeguro(destino))}`
      : "/elegir-empresa",
  );
}
