// Texto humano de las aprobaciones (CAR-250). Lógica pura; sin Prisma ni red.

const MAX_ACCION = 100;

/** `1 aprobación pendiente` / `N aprobaciones pendientes`. */
export function textoAprobacionesPendientes(n: number): string {
  return n === 1 ? "1 aprobación pendiente" : `${n} aprobaciones pendientes`;
}

/** «Grok pide emitir la factura 33, $ 11.900»: quién pide y qué (la acción ya viene redactada). */
export function frasePedido(agente: string, accion: string): string {
  return `${agente.trim() || "Un agente"} pide ${accion.trim()}`;
}

/**
 * Acción redactada a partir de la descripción de la capacidad, para las que no declaran su propio texto:
 * primera frase, sin punto final y acotada. «Emite un borrador: asigna folio…» → «Emite un borrador».
 */
export function accionGenerica(descripcion: string): string {
  const corte = descripcion.split(/[:.]\s/u)[0] ?? descripcion;
  const limpia = corte.replace(/[.:\s]+$/u, "").trim();
  return limpia.length > MAX_ACCION ? `${limpia.slice(0, MAX_ACCION - 1)}…` : limpia;
}

/** Resumen de una acción sin texto propio: «Grok pide aprobación: Emite un borrador». */
export function resumenGenerico(
  agente: string,
  capabilityId: string,
  descripcion: string | null,
): string {
  const accion = descripcion ? accionGenerica(descripcion) : "";
  return frasePedido(agente, `aprobación${accion ? `: ${accion}` : ` para ${capabilityId}`}`);
}

/** El formato anterior guardaba `<id de capacidad> <JSON del input>`. */
export function esResumenAntiguo(resumen: string, capabilityId: string): boolean {
  return resumen.startsWith(`${capabilityId} `) || resumen.startsWith(`${capabilityId}{`);
}

/**
 * Resumen a mostrar: el guardado si ya es texto humano; si es del formato anterior (id + JSON),
 * se reconstruye sin tocar la base con el agente y la descripción de la capacidad.
 */
export function resumenParaMostrar(p: {
  resumen: string;
  capabilityId: string;
  agente: string;
  descripcion: string | null;
}): string {
  if (!esResumenAntiguo(p.resumen, p.capabilityId)) return p.resumen;
  return resumenGenerico(p.agente, p.capabilityId, p.descripcion);
}
