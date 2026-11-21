import { z } from "zod";

import { instalacionEnAlcance, dondeInstalacionId } from "../rondas/comun";
import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { noEncontrado } from "../errores";
import { entradaListaSchema, PERMISO_LISTAS, TIPOS_LISTA, vistaEntrada } from "./comun";

export const listasListar = defineCapability({
  id: "acceso.listas.listar",
  descripcion:
    "Lista las entradas autorizadas y bloqueadas de una instalación, con el documento enmascarado, la vigencia, los días y el horario. El motivo de un bloqueo solo lo ve quien gestiona listas; nunca se devuelve el número completo.",
  permiso: PERMISO_LISTAS,
  input: z.object({ instalacionId: uuidSchema, tipo: z.enum(TIPOS_LISTA).optional() }),
  output: z.array(entradaListaSchema),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (salida) => salida.map((e) => e.id),
  async handler(ctx, { instalacionId, tipo }) {
    await instalacionEnAlcance(ctx, instalacionId);
    const filas = await ctx.db.entradaLista.findMany({
      where: { AND: [{ instalacionId }, dondeInstalacionId(ctx)], ...(tipo ? { tipo } : {}) },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return filas.map(vistaEntrada);
  },
});

export const listasQuitar = defineCapability({
  id: "acceso.listas.quitar",
  descripcion:
    "Quita una entrada de la lista autorizada o bloqueada de una instalación. Si la entrada ya se usó en algún ingreso no se borra: queda vencida desde ahora, para conservar el historial.",
  permiso: PERMISO_LISTAS,
  input: z.object({ id: uuidSchema }),
  output: z.object({ id: uuidSchema, accion: z.enum(["eliminada", "vencida"]) }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id }, { dryRun }) {
    const e = await ctx.db.entradaLista.findFirst({
      where: { AND: [{ id }, dondeInstalacionId(ctx)] },
      include: { registros: { select: { id: true }, take: 1 } },
    });
    if (!e) throw noEncontrado("La entrada de lista");
    const usada = e.registros.length > 0;
    if (!dryRun) {
      if (usada)
        await ctx.db.entradaLista.update({ where: { id }, data: { vigenteHasta: new Date() } });
      else await ctx.db.entradaLista.delete({ where: { id } });
    }
    return { id, accion: usada ? ("vencida" as const) : ("eliminada" as const) };
  },
});
