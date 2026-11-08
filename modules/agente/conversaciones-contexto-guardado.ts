import {
  dondeCuenta,
  dondeInstalacion,
  dondePersona,
  noEncontrado,
  obtenerCapacidad,
  restriccion,
  tienePermisoDeCapacidad,
  type Contexto,
} from "@opai/capabilities";
import type { z } from "zod";

import { FICHA } from "./conversaciones-contexto";
import type { contextoSchema } from "./conversaciones-guardado";

/**
 * Guard del guardado: no revela la ficha ni vuelve a ejecutar/cobrar su lectura. La preparación
 * ya hizo esa lectura auditada. Consulta solo el ID con los mismos filtros, dentro de ctx.db.
 */
export async function validarContextoAlGuardar(
  ctx: Contexto,
  c: z.infer<typeof contextoSchema>,
): Promise<void> {
  const capacidad = obtenerCapacidad(FICHA[c.tipo]);
  if (
    !capacidad ||
    capacidad.efecto !== "lectura" ||
    restriccion(ctx, capacidad) ||
    !tienePermisoDeCapacidad(ctx, capacidad)
  )
    throw noEncontrado("La ficha");

  const select = { id: true } as const;
  const fila =
    c.tipo === "cuenta"
      ? await ctx.db.cuenta.findFirst({ where: { id: c.id, AND: [dondeCuenta(ctx)] }, select })
      : c.tipo === "instalacion"
        ? await ctx.db.instalacion.findFirst({
            where: { id: c.id, AND: [dondeInstalacion(ctx)] },
            select,
          })
        : c.tipo === "persona"
          ? await ctx.db.persona.findFirst({
              where: { id: c.id, AND: [dondePersona(ctx)] },
              select,
            })
          : // negocioDe, usado por la ficha comercial, comprueba existencia bajo la misma RLS.
            await ctx.db.negocio.findUnique({ where: { id: c.id }, select });
  if (!fila) throw noEncontrado("La ficha");
}
