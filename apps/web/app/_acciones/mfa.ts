"use server";

import { redirect } from "next/navigation";

import {
  confirmarSegundoFactor,
  desactivarSegundoFactor,
  iniciarSegundoFactor,
  regenerarCodigosRespaldo,
  requireSession,
  verificarCodigoRespaldo,
  verificarSegundoFactor,
} from "@opai/auth";
import { destinoSeguro } from "@/app/(auth)/destino";
import { qrSvg } from "@/lib/qr";
import { identidadActual } from "@/lib/servidor";
import { mfaObligatoriaPara, verificarMfaDe } from "@/lib/mfa";
import { normalizarCodigoRespaldo } from "@/lib/codigo-mfa";

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
  // Normaliza en el servidor lo que el usuario pueda pegar: el TOTP a solo dígitos (acepta «123 456» o
  // «123-456») y el código de respaldo sin espacios; así un formato con separadores no se rechaza.
  const bruto = String(form.get("codigo") ?? "");
  const codigo = metodo === "respaldo" ? normalizarCodigoRespaldo(bruto) : bruto.replace(/\D/g, "");
  const n = siguiente(previo);
  const r =
    metodo === "respaldo"
      ? await verificarCodigoRespaldo(codigo)
      : await verificarSegundoFactor(codigo);
  if (r.ok)
    redirect(
      destino
        ? `/elegir-empresa?next=${encodeURIComponent(destinoSeguro(destino))}`
        : "/elegir-empresa",
    );
  if (r.fallo === "bloqueada") return { tipo: "pausado", n, ...PAUSA };
  if (r.fallo === "invalido") return { tipo: "expirado", n };
  return { tipo: "error", n, texto: r.mensaje };
}

// ----- Enrolamiento (en sesión): paso 1 clave + paso 2 código -----

export type InicioMfa =
  { ok: true; svg: string; secret: string; codigos: string[] } | { ok: false; error: string };

/** Paso 1: valida la contraseña y devuelve el QR (SVG), la clave manual y los códigos de respaldo. */
export async function accionIniciarMfa(
  _previo: InicioMfa | null,
  form: FormData,
): Promise<InicioMfa> {
  await requireSession();
  const password = String(form.get("password") ?? "");
  const r = await iniciarSegundoFactor(password);
  if (!r.ok) return { ok: false, error: r.mensaje };
  return { ok: true, svg: qrSvg(r.totpURI), secret: r.secret, codigos: r.backupCodes };
}

export type ConfirmaMfa = { ok: true } | { ok: false; error: string };

/** Paso 2: confirma con un código del autenticador y activa el segundo factor. */
export async function accionConfirmarMfa(
  _previo: ConfirmaMfa | null,
  form: FormData,
): Promise<ConfirmaMfa> {
  await requireSession();
  // El TOTP del autenticador son 6 dígitos: se aceptan separadores (espacios, guiones) y se normaliza.
  if (form.get("codigosGuardados") !== "si")
    return { ok: false, error: "Confirma que guardaste tus códigos de respaldo." };
  const codigo = String(form.get("codigo") ?? "").replace(/\D/g, "");
  const r = await confirmarSegundoFactor(codigo);
  return r.ok ? { ok: true } : { ok: false, error: r.mensaje };
}

/** Desactiva el segundo factor; exige la contraseña. */
export async function accionDesactivarMfa(
  _previo: ConfirmaMfa | null,
  form: FormData,
): Promise<ConfirmaMfa> {
  await requireSession();
  const identidad = await identidadActual();
  if (!identidad || (await mfaObligatoriaPara(identidad)) || (await verificarMfaDe(identidad)))
    return { ok: false, error: "Tu rol requiere el segundo factor o falta verificar la sesión." };
  const password = String(form.get("password") ?? "");
  const r = await desactivarSegundoFactor(password);
  return r.ok ? { ok: true } : { ok: false, error: r.mensaje };
}

export type RegenerarCodigos =
  { ok: true; codigos: string[] } | { ok: false; error: string } | null;

/** Regenera los códigos de respaldo (CAR-54, I-15); exige la contraseña. */
export async function accionRegenerarCodigos(
  _previo: RegenerarCodigos,
  form: FormData,
): Promise<RegenerarCodigos> {
  await requireSession();
  const password = String(form.get("password") ?? "");
  const r = await regenerarCodigosRespaldo(password);
  return r.ok ? { ok: true, codigos: r.codigos } : { ok: false, error: r.mensaje };
}
