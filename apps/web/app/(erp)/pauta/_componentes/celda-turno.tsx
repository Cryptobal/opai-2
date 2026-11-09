import { cn } from "@opai/ds";

import { etiquetaVariante, MOTIVO } from "./etiquetas";
import { etiquetaPresencia } from "./presencia";
import type { CeldaDia } from "./tipos";

/** Códigos de turno del diseño: D info, N acento, L libre, X danger (puesto por cubrir). */
export function codigoCelda(c: CeldaDia, noche: boolean): { texto: string; clase: string } {
  if (c.estado === "libre") return { texto: "L", clase: "bg-transparent font-normal text-fg-subtle" };
  if (c.estado === "sin_serie") return { texto: "·", clase: "bg-fill font-normal text-fg-subtle" };
  if (c.estado === "ppc")
    return { texto: "X", clase: "bg-danger-muted text-danger-fg shadow-[inset_0_0_0_1px_var(--ds-danger)]" };
  return noche
    ? { texto: "N", clase: "bg-accent-muted text-accent" }
    : { texto: "D", clase: "bg-info-muted text-info-fg" };
}

/** Texto accesible de una celda: estado, motivo, excepción y feriado. */
export function descripcionCelda(c: CeldaDia): string {
  const variante = etiquetaVariante(c.variante ?? null);
  const estado =
    c.estado === "cubierto"
      ? variante
        ? variante
        : c.confirmado
          ? "Cubierto · confirmado"
          : "Cubierto"
      : c.estado === "libre"
        ? "Libre"
        : c.estado === "sin_serie"
          ? "Sin serie"
          : `Sin cubrir · ${c.motivo ? MOTIVO[c.motivo] : ""}`;
  const pres = etiquetaPresencia(c);
  return [
    estado,
    pres ? `${pres.texto}${pres.detalle ? ` (${pres.detalle})` : ""}` : null,
    c.marcaManual ? "marca manual" : null,
    c.excepcion && !variante ? "excepción" : null,
    c.feriado ? `feriado: ${c.feriado}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Marca de excepción: borde punteado, para distinguir el día de la serie sin usar otro color. */
export const CLASE_EXCEPCION = cn("outline-1 -outline-offset-2 outline-dashed outline-warning");
