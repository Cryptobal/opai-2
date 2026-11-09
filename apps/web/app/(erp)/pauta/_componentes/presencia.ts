import type { CeldaDia, EstadoPresencia } from "./tipos";

type Tono = "success" | "warning" | "danger" | "neutro";

const ETIQUETA: Record<EstadoPresencia, { texto: string; tono: Tono }> = {
  presente: { texto: "Asistió", tono: "success" },
  incompleto: { texto: "Sin salida", tono: "warning" },
  sin_marca: { texto: "Sin marca", tono: "warning" },
  ausente: { texto: "Ausente", tono: "danger" },
  sin_turno: { texto: "Sin turno", tono: "neutro" },
};

/** Hora local de Chile (HH:mm) de un instante UTC; la zona solo se usa para presentar. */
export function horaChile(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/** Etiqueta de presencia de una celda, o null si no hay evidencia que mostrar (módulo apagado, sin permiso o turno libre). */
export function etiquetaPresencia(c: CeldaDia): { texto: string; tono: Tono; detalle: string } | null {
  const p = c.presencia;
  if (!p) return null;
  const base = ETIQUETA[p.estado];
  const entrada = horaChile(p.entrada);
  const salida = horaChile(p.salida);
  const detalle = [
    entrada ? `entrada ${entrada}` : null,
    salida ? `salida ${salida}` : null,
    p.atrasoMin > 0 ? `atraso ${p.atrasoMin} min` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return { ...base, detalle };
}
