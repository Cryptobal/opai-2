/** Política pura compartida por páginas, API, acciones y emisión de credenciales. */
export function mfaEsObligatoria(
  platformRole: unknown,
  rol: unknown,
  exigirOtros = false,
): boolean {
  return Boolean(platformRole) || rol === "owner" || rol === "admin" || exigirOtros;
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
