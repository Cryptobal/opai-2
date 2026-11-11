import { z } from "zod";

import { defineCapability } from "../define";
import { PERMISO_READ, embudoPorDefecto, vistaNegocio } from "./comun";
import { enriquecer, filaLista } from "./negocios-lectura";
import { indicadorSchema, indicadoresDeNegocios } from "./seguimiento-indicadores";

/** Tablero del embudo (separado de negocios-lectura en CAR-160, al sumar el indicador de seguimiento). */
export const negociosEmbudo = defineCapability({
  auditarLectura: (s) => s.negocios.flatMap((n) => [n.id, n.cuentaId]),
  id: "comercial.negocios.embudo",
  descripcion:
    "Resumen del embudo por defecto para el tablero: sus etapas con tipo, orden y probabilidad, y los negocios no archivados de cada etapa (los 500 más recientes).",
  permiso: PERMISO_READ,
  input: z.object({ responsableId: z.uuid().optional() }),
  output: z.object({
    etapas: z.array(
      z.object({
        id: z.string(),
        nombre: z.string(),
        tipo: z.string(),
        orden: z.number(),
        probabilidad: z.number(),
        tono: z.string(),
      }),
    ),
    negocios: z.array(filaLista.extend({ seguimiento: indicadorSchema })),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const embudo = await embudoPorDefecto(ctx);
    const etapas = await ctx.db.etapa.findMany({
      where: { embudoId: embudo.id, activa: true },
      orderBy: { orden: "asc" },
    });
    const negocios = await ctx.db.negocio.findMany({
      where: {
        embudoId: embudo.id,
        archivadoEn: null,
        ...(input.responsableId ? { responsableId: input.responsableId } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 500,
    });
    const extra = await enriquecer(ctx, negocios);
    const seguimientos = await indicadoresDeNegocios(
      ctx,
      negocios.map((n) => n.id),
    );
    return {
      etapas: etapas.map((e) => ({
        id: e.id,
        nombre: e.nombre,
        tipo: e.tipo,
        orden: e.orden,
        probabilidad: e.probabilidad,
        tono: e.tono,
      })),
      negocios: negocios.map((n) => ({
        ...vistaNegocio(n),
        ...extra(n),
        seguimiento: seguimientos.get(n.id) ?? null,
      })),
    };
  },
});
