// Definiciones activas de campos personalizados de cuenta para plantillas (CAR-421).
import type { Contexto } from "../../types";

export type CampoCuentaPlantilla = { clave: string; etiqueta: string };

export async function camposCuentaPlantilla(ctx: Contexto): Promise<CampoCuentaPlantilla[]> {
  const filas = await ctx.db.campoPersonalizado.findMany({
    where: { entidad: "cuenta", activo: true },
    orderBy: [{ orden: "asc" }, { id: "asc" }],
    take: 200,
    select: { clave: true, etiqueta: true },
  });
  return filas.map((f) => ({ clave: f.clave, etiqueta: f.etiqueta }));
}

export const clavesActivasCuenta = (campos: readonly CampoCuentaPlantilla[]) =>
  new Set(campos.map((c) => c.clave));