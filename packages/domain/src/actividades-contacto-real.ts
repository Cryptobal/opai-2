// «Último contacto real» de un negocio (CAR-162): lo que de verdad habló con el cliente.
// Una llamada que no contestó, una nota o una tarea no cuentan. Función pura.

export type ActividadContacto = {
  tipo: string;
  ocurrioEn: string;
  resultado?: string | null;
};

const SIEMPRE_REAL = new Set(["correo", "whatsapp", "reunion", "visita"]);

/** ¿La actividad es un contacto real con el cliente (y ya ocurrió)? */
export function esContactoReal(a: ActividadContacto, ahora: Date): boolean {
  if (Date.parse(a.ocurrioEn) > ahora.getTime()) return false;
  if (SIEMPRE_REAL.has(a.tipo)) return true;
  return a.tipo === "llamada" && (a.resultado == null || a.resultado === "contesto");
}

/** El contacto real más reciente, o null si no hay ninguno. */
export function ultimoContactoReal<T extends ActividadContacto>(
  actividades: readonly T[],
  ahora: Date,
): T | null {
  let mejor: T | null = null;
  for (const a of actividades) {
    if (!esContactoReal(a, ahora)) continue;
    if (!mejor || a.ocurrioEn > mejor.ocurrioEn) mejor = a;
  }
  return mejor;
}

/** Texto «hace N días» respecto de `ahora`. */
export function textoHace(desde: string, ahora: Date): string {
  const dias = Math.floor((ahora.getTime() - Date.parse(desde)) / 86_400_000);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  return `hace ${dias} días`;
}
