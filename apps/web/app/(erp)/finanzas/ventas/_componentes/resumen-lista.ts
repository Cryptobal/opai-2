import { pesos } from "@/lib/fechas";

import type { LibroVentas, Venta } from "./tipos";

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/**
 * Texto bajo el título de la lista de ventas (CAR-261). Siempre habla de lo que la persona ve:
 * - Solo borradores: cuántos son y cuánto suman, y por qué no entran al libro (aún no tienen folio).
 * - Con período y sin otros filtros: el resumen del libro oficial del período (solo emitidos) y, aparte, los borradores visibles.
 * - Cualquier otro caso: los documentos emitidos de la lista, con las notas de crédito restando, y los borradores aparte.
 */
export function resumenLista(items: Venta[], siguiente: string | null, libro: LibroVentas["resumen"] | null): string | null {
  if (items.length === 0 && !libro) return null;
  const borradores = items.filter((v) => v.estadoDte === "borrador");
  const emitidos = items.filter((v) => v.estadoDte !== "borrador");
  const totalBorradores = borradores.reduce((s, v) => s + v.montoTotal, 0);
  const parcial = siguiente ? ` · primeros ${items.length}` : "";
  if (emitidos.length === 0 && borradores.length > 0 && !libro) {
    return `${plural(borradores.length, "borrador", "borradores")} · ${pesos(totalBorradores)} · Sin folio: no suman al libro de ventas${parcial}`;
  }
  const base = libro
    ? `Libro del período: ${plural(libro.documentos, "documento", "documentos")} · Neto ${pesos(libro.neto)} · Total ${pesos(libro.total)}`
    : `${plural(emitidos.length, "documento", "documentos")} · Total ${pesos(emitidos.reduce((s, v) => s + (v.tipoDte === 61 ? -v.montoTotal : v.montoTotal), 0))}${parcial}`;
  return borradores.length > 0
    ? `${base} · Además ${plural(borradores.length, "borrador", "borradores")} por ${pesos(totalBorradores)}, sin folio y fuera del total`
    : base;
}
