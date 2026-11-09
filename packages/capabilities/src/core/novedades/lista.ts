import { z } from "zod";

import { defineCapability } from "../../define";
import { dbLecturaNovedades, entradasPara, etiquetaModulo, usuarioDe } from "./comun";

const itemSchema = z.object({
  id: z.string(),
  fecha: z.string(),
  modulo: z.string(),
  moduloEtiqueta: z.string(),
  titulo: z.string(),
  descripcion: z.string(),
  ruta: z.string().nullable(),
  imagen: z.string().nullable(),
  destacada: z.boolean(),
  car: z.string().nullable(),
  leida: z.boolean(),
  destacadaDescartada: z.boolean(),
});

export const novedadesList = defineCapability({
  auditarLectura: false,
  id: "core.novedades.list",
  descripcion:
    "Lista cronológica de novedades de producto visibles para el tenant, el rol y los módulos activos.",
  permiso: null,
  portales: ["erp", "supervisor", "trabajador", "terreno", "cliente", "platform"],
  input: z.object({}),
  output: z.object({
    items: z.array(itemSchema),
    noLeidas: z.number().int(),
    destacadaPendiente: itemSchema.nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const usuarioId = usuarioDe(ctx);
    const visibles = entradasPara(ctx);
    const ids = visibles.map((v) => v.id);
    const db = dbLecturaNovedades(ctx);
    const lecturas = ids.length
      ? await db.novedadLectura.findMany({
          where: { usuarioId, novedadId: { in: ids } },
        })
      : [];
    const porId = new Map(lecturas.map((l) => [l.novedadId, l]));
    let noLeidas = 0;
    const items = visibles.map((e) => {
      const l = porId.get(e.id);
      const leida = Boolean(l?.leidaEn);
      const destacadaDescartada = Boolean(l?.destacadaDescartadaEn);
      if (!leida) noLeidas += 1;
      return {
        id: e.id,
        fecha: e.fecha,
        modulo: e.modulo,
        moduloEtiqueta: etiquetaModulo(e.modulo),
        titulo: e.titulo,
        descripcion: e.descripcion,
        ruta: e.ruta,
        imagen: e.imagen,
        destacada: e.destacada,
        car: e.car,
        leida,
        destacadaDescartada,
      };
    });
    const destacadaPendiente =
      items.find((i) => i.destacada && !i.leida && !i.destacadaDescartada) ?? null;
    return { items, noLeidas, destacadaPendiente };
  },
});
