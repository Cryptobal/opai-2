import type { CodigoError } from "@opai/capabilities";

/**
 * Mensajes de error de la UI en español de negocio (B7, CAR-153). El texto técnico del servidor
 * (ids de capacidad, «Input inválido.», códigos de Prisma) nunca llega a la pantalla: va a la consola.
 * Cada mensaje dice qué pasó y qué hacer.
 */
const MENSAJES: Record<CodigoError, string> = {
  INVALID_INPUT: "Hay datos que no son válidos. Revisa los campos marcados y vuelve a intentar.",
  INVALID_OUTPUT: "No pudimos preparar la respuesta. Reintenta; si sigue igual, avisa a un administrador.",
  UNAUTHENTICATED: "Tu sesión terminó. Vuelve a iniciar sesión para continuar.",
  FORBIDDEN: "No tienes permiso para hacer esto. Pídele acceso a un administrador.",
  NOT_FOUND: "No encontramos lo que buscas. Puede que ya no exista; actualiza la página.",
  CONFLICT: "Esto cambió mientras lo editabas o ya existe. Actualiza la página y revisa antes de repetir.",
  UNPROCESSABLE: "No se puede hacer en este momento. Revisa el estado e intenta de nuevo.",
  DRY_RUN_NOT_SUPPORTED: "Esta acción no tiene vista previa. Confírmala para ejecutarla.",
  APPROVAL_REQUIRED: "Esta acción necesita la aprobación de una persona antes de ejecutarse.",
  BUDGET_EXCEEDED: "Se alcanzó el límite de uso definido. Un administrador puede ampliarlo.",
  INTERNAL: "Ocurrió un error de nuestro lado. Reintenta en unos minutos; si sigue igual, avisa a un administrador.",
};

/** Mensajes de regla de negocio que sí se pueden mostrar tal cual (escritos en español para la persona). */
const TECNICO = /capacidad|scope|input|zod|prisma|payload|tenant|undefined|null|\bP\d{4}\b|\bid\b|"/i;

export function esMensajeDeNegocio(m: string): boolean {
  return m.length >= 8 && m.length <= 220 && /^[A-ZÁÉÍÓÚÑ¿¡]/.test(m) && !TECNICO.test(m);
}

/** Texto que ve la persona. Solo las reglas de negocio y conflictos conservan su mensaje de origen. */
export function mensajeDeError(codigo: string, mensajeServidor: string): string {
  const base = MENSAJES[codigo as CodigoError] ?? MENSAJES.INTERNAL;
  const mostrable = codigo === "UNPROCESSABLE" || codigo === "CONFLICT";
  return mostrable && esMensajeDeNegocio(mensajeServidor) ? mensajeServidor : base;
}
