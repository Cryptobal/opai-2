/**
 * Política pura compartida por páginas, API, acciones y emisión de credenciales.
 *
 * Decisión de Carlos (11-nov-2026, CAR-286, cambia el ADR-002 / NÚCLEO-F): el segundo factor es
 * responsabilidad de cada usuario y deja de ser obligatorio para owner, admin y la empresa. Solo las
 * cuentas con rol de plataforma lo siguen exigiendo (pregunta abierta para Carlos en ESTADO.md).
 */
export function mfaEsObligatoria(platformRole: unknown): boolean {
  return Boolean(platformRole);
}

export type EstadoMfa = { activa: boolean; verificada: boolean; obligatoria: boolean };

/** Tener MFA en la cuenta no demuestra que esta sesión haya pasado el segundo factor. */
export function pendienteMfa(estado: EstadoMfa): "enrolar" | "verificar" | null {
  if (!estado.activa) return estado.obligatoria ? "enrolar" : null;
  return estado.verificada ? null : "verificar";
}

export function pideSegundoFactor(respuesta: unknown): boolean {
  return (
    typeof respuesta === "object" &&
    respuesta !== null &&
    Reflect.get(respuesta, "twoFactorRedirect") === true
  );
}
