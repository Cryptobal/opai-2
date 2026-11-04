import { z } from "zod";

/** Largo máximo del texto de búsqueda y mínimo cuando no está vacío (CAR-120). */
export const BUSQUEDA_MAX = 120;
export const BUSQUEDA_MIN = 2;

/**
 * Texto de búsqueda por título: se recorta, admite hasta 120 caracteres y, si no está vacío, pide
 * al menos 2. Un texto vacío equivale a no buscar.
 */
export const busquedaSchema = z
  .string()
  .trim()
  .max(BUSQUEDA_MAX)
  .refine((t) => t.length === 0 || t.length >= BUSQUEDA_MIN, {
    message: `Escribe al menos ${BUSQUEDA_MIN} caracteres para buscar.`,
  });

/**
 * Escapa `\`, `%` y `_` para que el texto del usuario sea literal dentro de `contains` (LIKE):
 * Prisma no los escapa y, sin esto, `%` o `_` actuarían como comodines.
 */
export const escaparComodines = (t: string) => t.replace(/[\\%_]/g, "\\$&");

/** Filtro Prisma por título (sin distinguir mayúsculas) o `{}` si no hay texto. */
export function filtroTitulo(q: string | undefined) {
  const t = q?.trim() ?? "";
  return t ? { titulo: { contains: escaparComodines(t), mode: "insensitive" as const } } : {};
}
