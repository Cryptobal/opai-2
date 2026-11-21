import { z } from "zod";

/** Propietario en filas del explorador y vencimientos. */
export const entidadPropietarioSchema = z
  .object({ tipo: z.string(), id: z.string(), nombre: z.string().nullable() })
  .nullable()
  .describe(
    "Propietario del documento; el nombre solo si el actor puede leer ese tipo de entidad.",
  );

/** Auditoría de lecturas que revelan nombres de personas en la página (matriz, explorar, vencimientos). */
export function auditarLecturaFilasConPersona<
  T extends { id: string; entidad?: { tipo: string; id: string; nombre: string | null } | null },
>(s: { items: T[] }) {
  return [
    ...s.items.map((d) => d.id),
    ...s.items.flatMap((d) =>
      d.entidad?.tipo === "persona" && d.entidad.nombre ? [d.entidad.id] : [],
    ),
  ];
}