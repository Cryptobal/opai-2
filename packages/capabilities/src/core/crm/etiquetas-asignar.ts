// Asignar y quitar etiquetas a negocios, cuentas y contactos, en lote (CAR-26).
import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import { ENTIDADES_ETIQUETA, exigirEntidad, refDe } from "./comun";
import { etiquetaSchema } from "./etiquetas";

const entrada = z.object({
  entidadTipo: z.enum(ENTIDADES_ETIQUETA),
  entidadIds: z.array(uuidSchema).min(1).max(50),
  etiquetaIds: z.array(uuidSchema).min(1).max(10),
});

/** Valida entidades (existen y están en el alcance) y etiquetas del catálogo. */
async function validar(ctx: Contexto, i: z.infer<typeof entrada>, soloActivas: boolean) {
  const entidades = [...new Set(i.entidadIds)];
  const etiquetas = [...new Set(i.etiquetaIds)];
  for (const id of entidades) await exigirEntidad(ctx, i.entidadTipo, id);
  const filas = await ctx.db.etiqueta.findMany({ where: { id: { in: etiquetas } } });
  if (filas.length !== etiquetas.length) throw noEncontrado("La etiqueta");
  if (soloActivas && filas.some((e) => !e.activa))
    throw reglaDeNegocio("Hay etiquetas desactivadas: no se pueden asignar.");
  return { entidades, etiquetas };
}

const donde = (i: z.infer<typeof entrada>, entidades: string[], etiquetas: string[]) => ({
  etiquetaId: { in: etiquetas },
  [`${i.entidadTipo}Id`]: { in: entidades },
});

export const etiquetasAsignar = defineCapability({
  id: "core.etiquetas.asignar",
  descripcion:
    "Asigna una o más etiquetas del catálogo a varios negocios, cuentas o contactos a la vez. Lo que ya tenía la etiqueta se deja igual.",
  permiso: PERMISOS_CORE.etiquetasManage,
  input: entrada,
  output: z.object({ asignadas: z.number(), yaEstaban: z.number() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const { entidades, etiquetas } = await validar(ctx, input, true);
    const previas = await ctx.db.etiquetaAsignacion.findMany({
      where: donde(input, entidades, etiquetas),
    });
    const clave = (e: string, t: string) => `${e}:${t}`;
    const tienen = new Set(
      previas.map((p) => clave(p.etiquetaId, p[`${input.entidadTipo}Id`] ?? "")),
    );
    const nuevas = etiquetas.flatMap((t) =>
      entidades.filter((e) => !tienen.has(clave(t, e))).map((e) => ({ t, e })),
    );
    const resultado = { asignadas: nuevas.length, yaEstaban: previas.length };
    if (dryRun || !nuevas.length) return resultado;
    await ctx.transaccion(async (tx) => {
      for (const { t, e } of nuevas) {
        const { instalacionId: _sinUso, ...ref } = refDe(input.entidadTipo, e);
        await tx.etiquetaAsignacion.create({
          data: { tenantId: ctx.tenantId, etiquetaId: t, ...ref },
        });
      }
      await ctx.eventos.emitir(tx, {
        tipo: "core.etiqueta.asignada",
        entidadTipo: input.entidadTipo,
        entidadId: entidades[0] ?? "",
        payload: { entidades: entidades.length, etiquetas: etiquetas.length },
      });
    });
    return resultado;
  },
});

export const etiquetasQuitar = defineCapability({
  id: "core.etiquetas.quitar",
  descripcion:
    "Quita una o más etiquetas de varios negocios, cuentas o contactos a la vez. No borra la etiqueta del catálogo.",
  permiso: PERMISOS_CORE.etiquetasManage,
  input: entrada,
  output: z.object({ quitadas: z.number() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const { entidades, etiquetas } = await validar(ctx, input, false);
    const quitadas = await ctx.db.etiquetaAsignacion.count({
      where: donde(input, entidades, etiquetas),
    });
    if (dryRun || !quitadas) return { quitadas };
    await ctx.transaccion(async (tx) => {
      await tx.etiquetaAsignacion.deleteMany({ where: donde(input, entidades, etiquetas) });
      await ctx.eventos.emitir(tx, {
        tipo: "core.etiqueta.quitada",
        entidadTipo: input.entidadTipo,
        entidadId: entidades[0] ?? "",
        payload: { quitadas },
      });
    });
    return { quitadas };
  },
});

export const etiquetasDeEntidad = defineCapability({
  auditarLectura: (s) => s.map((e) => e.id),
  id: "core.etiquetas.de_entidad",
  descripcion: "Etiquetas que tiene un negocio, una cuenta o un contacto.",
  permiso: PERMISOS_CORE.etiquetasRead,
  portales: ["erp"],
  input: z.object({ entidadTipo: z.enum(ENTIDADES_ETIQUETA), entidadId: uuidSchema }),
  output: z.array(etiquetaSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    await exigirEntidad(ctx, input.entidadTipo, input.entidadId);
    const asignadas = await ctx.db.etiquetaAsignacion.findMany({
      where: { [`${input.entidadTipo}Id`]: input.entidadId },
    });
    const filas = await ctx.db.etiqueta.findMany({
      where: { id: { in: asignadas.map((a) => a.etiquetaId) } },
      orderBy: { nombre: "asc" },
    });
    return filas.map((e) => ({
      id: e.id,
      nombre: e.nombre,
      tono: e.tono as (typeof etiquetaSchema.shape.tono.options)[number],
      activa: e.activa,
    }));
  },
});
