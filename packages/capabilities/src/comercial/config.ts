import { z } from "zod";

import { defineCapability } from "../define";
import { PERMISO_READ, catalogoItemSchema, embudoPorDefecto, embudoSchema } from "./comun";
import { TONOS_ETAPA } from "./dominio";

/** Lee el embudo por defecto con sus etapas y los catálogos de tipos, orígenes y motivos (Configuración → Comercial). */
export const configGet = defineCapability({
  id: "comercial.config.get",
  descripcion:
    "Configuración del módulo Comercial: el embudo por defecto con sus etapas (tipo, orden, probabilidad, requisitos) y los catálogos de tipos de negocio, orígenes y motivos de pérdida.",
  permiso: PERMISO_READ,
  input: z.object({}),
  output: z.object({
    embudo: embudoSchema,
    tipos: z.array(catalogoItemSchema),
    origenes: z.array(catalogoItemSchema),
    motivos: z.array(catalogoItemSchema.extend({ codigo: z.string(), exigeDetalle: z.boolean() })),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const embudo = await embudoPorDefecto(ctx);
    const [etapas, tipos, origenes, motivos] = await Promise.all([
      ctx.db.etapa.findMany({ where: { embudoId: embudo.id }, orderBy: { orden: "asc" } }),
      ctx.db.tipoNegocio.findMany({ orderBy: { orden: "asc" } }),
      ctx.db.origenNegocio.findMany({ orderBy: { orden: "asc" } }),
      ctx.db.motivoPerdida.findMany({ orderBy: { orden: "asc" } }),
    ]);
    const tono = (t: string) => ((TONOS_ETAPA as readonly string[]).includes(t) ? t : "neutral");
    return {
      embudo: {
        id: embudo.id,
        nombre: embudo.nombre,
        porDefecto: embudo.porDefecto,
        etapas: etapas.map((e) => ({
          id: e.id,
          nombre: e.nombre,
          orden: e.orden,
          tipo: e.tipo as "abierta" | "ganada" | "perdida",
          probabilidad: e.probabilidad,
          tono: tono(e.tono) as (typeof TONOS_ETAPA)[number],
          exige: e.exige,
          activa: e.activa,
        })),
      },
      tipos: tipos.map((t) => ({ id: t.id, nombre: t.nombre, orden: t.orden, activo: t.activo })),
      origenes: origenes.map((o) => ({ id: o.id, nombre: o.nombre, orden: o.orden, activo: o.activo })),
      motivos: motivos.map((m) => ({
        id: m.id,
        nombre: m.nombre,
        orden: m.orden,
        activo: m.activo,
        codigo: m.codigo,
        exigeDetalle: m.exigeDetalle,
      })),
    };
  },
});
