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
export function soportaPasskeys(): boolean {
  return typeof window !== "undefined" && typeof window.PublicKeyCredential === "function";
}

const sinSuscripcion = () => () => undefined;

/** Soporte de passkeys sin desajuste de hidratación: en el servidor se asume que sí. */
export function useSoportaPasskeys(): boolean {
  return useSyncExternalStore(sinSuscripcion, soportaPasskeys, () => true);
}

/** Autocompletado de passkeys en el campo de correo (mediación condicional), si el navegador lo trae. */
export async function soportaAutocompletado(): Promise<boolean> {
  if (!soportaPasskeys()) return false;
  return (await lib()).browserSupportsWebAuthnAutofill();
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

/** Mensaje para una ceremonia cancelada o rechazada por el navegador (sin detalles técnicos). */
export function mensajeWebAuthn(error: unknown): string | null {
  const nombre = error instanceof Error ? error.name : "";
  if (nombre === "NotAllowedError" || nombre === "AbortError") return null; // canceló o expiró
  if (nombre === "InvalidStateError") return "Esta passkey ya está guardada en tu cuenta.";
  return "Tu navegador no pudo usar la passkey. Prueba de nuevo o usa otro método.";
}
