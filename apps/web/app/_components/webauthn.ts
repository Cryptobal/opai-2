/**
 * Cliente WebAuthn mínimo (CAR-286): `@simplewebauthn/browser` se carga solo al usarlo, así no suma
 * al JS inicial de las rutas (ADR-037). Convierte entre el JSON del servidor y `navigator.credentials`.
 */
import type {
  PublicKeyCredentialCreationOptionsJSON as OpcionesRegistro,
  PublicKeyCredentialRequestOptionsJSON as Opciones,
} from "@simplewebauthn/browser";
import { useSyncExternalStore } from "react";

const lib = () => import("@simplewebauthn/browser");

/** El navegador soporta passkeys (WebAuthn). */
function soportaPasskeys(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.PublicKeyCredential === "function";
  } catch {
    return false;
  }
}

const sinSuscripcion = () => () => undefined;

/** Soporte de passkeys sin desajuste de hidratación: en el servidor se asume que sí. */
export function useSoportaPasskeys(): boolean {
  return useSyncExternalStore(sinSuscripcion, soportaPasskeys, () => true);
}

/** Autocompletado de passkeys en el campo de correo (mediación condicional), si el navegador lo trae. */
export async function soportaAutocompletado(): Promise<boolean> {
  if (!soportaPasskeys()) return false;
  try {
    return await (await lib()).browserSupportsWebAuthnAutofill();
  } catch {
    // La mediación condicional es opcional: deja disponibles el botón y la contraseña.
    return false;
  }
}

export async function crearPasskey(opciones: OpcionesRegistro) {
  return (await lib()).startRegistration({ optionsJSON: opciones });
}

export async function usarPasskey(opciones: Opciones, autocompletado = false) {
  return (await lib()).startAuthentication({
    optionsJSON: opciones,
    useBrowserAutofill: autocompletado,
  });
}

/** Cancela la ceremonia en curso (p. ej. el autocompletado condicional antes de usar el botón). */
export async function cancelarCeremonia(): Promise<void> {
  (await lib()).WebAuthnAbortService.cancelCeremony();
}

/** Cancelación del autocompletado condicional (CAR-728): no es un fallo que deba mostrarse en pantalla. */
export function esCancelacionPasskey(error: unknown): boolean {
  const nombre = error instanceof Error ? error.name : "";
  return nombre === "NotAllowedError" || nombre === "AbortError";
}

/** Mensaje para una ceremonia cancelada o rechazada por el navegador (sin detalles técnicos). */
export function mensajeWebAuthn(error: unknown): string | null {
  if (esCancelacionPasskey(error)) return null; // canceló o expiró
  const nombre = error instanceof Error ? error.name : "";
  if (nombre === "InvalidStateError") return "Esta passkey ya está guardada en tu cuenta.";
  if (nombre === "SecurityError") {
    return "El dominio de esta página no coincide con tu passkey. Entra desde el mismo sitio donde la guardaste o usa contraseña u otro método.";
  }
  if (nombre === "NotSupportedError") {
    return "Tu dispositivo o navegador no admite passkeys. Usa contraseña u otro método.";
  }
  return "Tu navegador no pudo usar la passkey. Prueba de nuevo o usa otro método.";
}
