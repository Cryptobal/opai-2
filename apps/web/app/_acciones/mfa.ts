"use server";

import { redirect } from "next/navigation";

import {
  confirmarSegundoFactor,
  desactivarSegundoFactor,
  iniciarSegundoFactor,
  requireSession,
  verificarCodigoRespaldo,
  verificarSegundoFactor,
} from "@opai/auth";
import { qrSvg } from "@opai/ds";

import { destinoSeguro } from "@/app/(auth)/destino";

/** Aviso genérico de pausa, igual que el del login (no revela intentos restantes). */
const PAUSA = {
  titulo: "Pausamos el acceso",
  texto: "Hubo demasiados intentos. Vuelve a intentarlo en unos minutos.",
};

// ----- Verificación del segundo factor en el login (desafío por cookie, sin sesión aún) -----

export type EstadoVerificar =
  | { tipo: "inicial" }
  | { tipo: "error"; n: number; texto: string }
  | { tipo: "pausado"; n: number; titulo: string; texto: string }
  | { tipo: "expirado"; n: number };

const siguiente = (previo: EstadoVerificar): number => ("n" in previo ? previo.n : 0) + 1;

/**
 * Verifica el segundo factor en el login. `metodo` elige TOTP (autenticador) o un código de respaldo.
 * Con éxito, la sesión queda creada y se sigue al selector de empresa (o al destino). Un bloqueo por
 * cuenta comparte el aviso del login; un desafío expirado manda a reiniciar sesión.
 */
export async function accionVerificar(
  destino: string,
  metodo: string,
  previo: EstadoVerificar,
  form: FormData,
): Promise<EstadoVerificar> {
  const codigo = String(form.get("codigo") ?? "").trim();
  const n = siguiente(previo);
  const r =
    metodo === "respaldo"
      ? await verificarCodigoRespaldo(codigo)
      : await verificarSegundoFactor(codigo);
  if (r.ok) redirect(`/elegir-empresa?next=${encodeURIComponent(destinoSeguro(destino))}`);
  if (r.fallo === "bloqueada") return { tipo: "pausado", n, ...PAUSA };
  if (r.fallo === "invalido") return { tipo: "expirado", n };
  return { tipo: "error", n, texto: r.mensaje };
}

// ----- Enrolamiento (en sesión): paso 1 clave + paso 2 código -----

export type InicioMfa =
  | { ok: true; svg: string; codigos: string[] }
  | { ok: false; error: string };

/** Paso 1: valida la contraseña y devuelve el QR (SVG) y los códigos de respaldo (una sola vez). */
export async function accionIniciarMfa(_previo: InicioMfa | null, form: FormData): Promise<InicioMfa> {
  await requireSession();
  const password = String(form.get("password") ?? "");
  const r = await iniciarSegundoFactor(password);
  if (!r.ok) return { ok: false, error: r.mensaje };
  return { ok: true, svg: qrSvg(r.totpURI), codigos: r.backupCodes };
}

export type ConfirmaMfa = { ok: true } | { ok: false; error: string };

/** Paso 2: confirma con un código del autenticador y activa el segundo factor. */
export async function accionConfirmarMfa(
  _previo: ConfirmaMfa | null,
  form: FormData,
): Promise<ConfirmaMfa> {
  await requireSession();
  const codigo = String(form.get("codigo") ?? "").trim();
  const r = await confirmarSegundoFactor(codigo);
  return r.ok ? { ok: true } : { ok: false, error: r.mensaje };
}

/** Desactiva el segundo factor; exige la contraseña. */
export async function accionDesactivarMfa(
  _previo: ConfirmaMfa | null,
  form: FormData,
): Promise<ConfirmaMfa> {
  await requireSession();
  const password = String(form.get("password") ?? "");
  const r = await desactivarSegundoFactor(password);
  return r.ok ? { ok: true } : { ok: false, error: r.mensaje };
}
