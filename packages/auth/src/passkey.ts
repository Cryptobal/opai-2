import { headers } from "next/headers";

import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";
import { APIError } from "better-auth/api";

import { auth } from "./auth";
import type { ResultadoAcceso } from "./acciones";
import { respuestaEntradaWebAuthn, respuestaRegistro } from "./passkey-respuesta";

/**
 * Passkeys desde el servidor (CAR-286, ADR-037): las opciones y la verificación de la ceremonia
 * WebAuthn van por Server Actions con `auth.api.*`; el navegador solo llama a
 * `navigator.credentials` (sin cliente de Better Auth). El desafío viaja en la cookie firmada del
 * plugin (5 minutos, un solo uso).
 */
export type ResultadoPasskey = { ok: true } | { ok: false; mensaje: string };

function codigoDe(error: unknown): string | undefined {
  return error instanceof APIError
    ? (error.body as { code?: string } | undefined)?.code
    : undefined;
}

const INVALIDA = "La respuesta del dispositivo no es válida. Vuelve a intentarlo.";

const MENSAJES: Record<string, string> = {
  SESSION_NOT_FRESH: "Por seguridad, vuelve a iniciar sesión para agregar una passkey.",
  PASSKEY_SIN_VERIFICACION: "Tu dispositivo no confirmó tu identidad (huella, rostro o PIN).",
  CHALLENGE_NOT_FOUND: "La solicitud expiró. Vuelve a intentarlo.",
  PASSKEY_NOT_FOUND: "No reconocemos esa passkey. Entra con tu correo y contraseña.",
};

function falloPasskey(error: unknown, defecto: string): ResultadoPasskey {
  if (!(error instanceof APIError)) throw error;
  return { ok: false, mensaje: MENSAJES[codigoDe(error) ?? ""] ?? defecto };
}

/** Opciones para registrar una passkey nueva en la cuenta con sesión. */
export async function opcionesNuevaPasskey(): Promise<
  { ok: true; opciones: PublicKeyCredentialCreationOptionsJSON } | { ok: false; mensaje: string }
> {
  try {
    const opciones = await auth.api.generatePasskeyRegistrationOptions({
      headers: await headers(),
    });
    return { ok: true, opciones };
  } catch (error) {
    if (error instanceof APIError && error.statusCode === 403 && !codigoDe(error))
      return { ok: false, mensaje: "Completa el segundo factor antes de agregar una passkey." };
    const r = falloPasskey(error, "No se pudo preparar la passkey.");
    return r.ok ? { ok: false, mensaje: "No se pudo preparar la passkey." } : r;
  }
}

/** Verifica la respuesta del autenticador y guarda la passkey con su nombre. */
export async function guardarPasskey(
  respuesta: unknown,
  nombre: string,
): Promise<ResultadoPasskey> {
  const r = respuestaRegistro.safeParse(respuesta);
  if (!r.success) return { ok: false, mensaje: INVALIDA };
  try {
    await auth.api.verifyPasskeyRegistration({
      body: { response: r.data, name: nombre.trim().slice(0, 60) || "Passkey" },
      headers: await headers(),
    });
    return { ok: true };
  } catch (error) {
    return falloPasskey(error, "No se pudo guardar la passkey. Vuelve a intentarlo.");
  }
}

/** Opciones para entrar con passkey (credenciales detectables: sin pedir el correo). */
export async function opcionesEntrarConPasskey(): Promise<PublicKeyCredentialRequestOptionsJSON> {
  return auth.api.generatePasskeyAuthenticationOptions({ headers: await headers() });
}

/** Entra con passkey: crea la sesión con el segundo factor completo. */
export async function entrarConPasskey(respuesta: unknown): Promise<ResultadoAcceso> {
  const response = respuestaEntradaWebAuthn(respuesta);
  if (!response) return { ok: false, fallo: "invalido", mensaje: INVALIDA };
  try {
    await auth.api.verifyPasskeyAuthentication({
      body: { response },
      headers: await headers(),
    });
    return { ok: true };
  } catch (error) {
    if (codigoDe(error) === "ACCOUNT_SUSPENDED" && error instanceof Error)
      return { ok: false, fallo: "suspendida", mensaje: error.message };
    const f = falloPasskey(error, "No pudimos verificar la passkey. Vuelve a intentarlo.");
    return { ok: false, fallo: "credenciales", mensaje: f.ok ? "" : f.mensaje };
  }
}
