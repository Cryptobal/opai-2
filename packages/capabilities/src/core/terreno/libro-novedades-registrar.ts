import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import { dondeInstalacion } from "../maestros/alcance";
import { quien } from "./comun";
import { gravedadNovedadSchema, novedadSchema, vistaNovedad } from "./libro-novedades-comun";

const input = z.object({
  instalacionId: uuidSchema,
  resumen: z.string().trim().min(3).max(200),
  detalle: z.string().trim().max(2000).optional(),
  gravedad: gravedadNovedadSchema.optional(),
  tipoIncidenteId: uuidSchema
    .optional()
    .describe("Tipo de incidente de Rondas (si el módulo está activo)."),
  puntoId: uuidSchema
    .optional()
    .describe("Punto de control de la instalación (si Rondas está activo)."),
});

/** Punto y tipo de Rondas: solo con el módulo activo, el punto de la misma instalación y el tipo activo. */
async function gravedadDeRondas(
  ctx: Contexto,
  e: z.infer<typeof input>,
): Promise<string | undefined> {
  if (!e.puntoId && !e.tipoIncidenteId) return undefined;
  if (!ctx.modulosActivos.includes("rondas"))
    throw reglaDeNegocio(
      "Para enlazar un punto o un tipo de incidente, el módulo Rondas debe estar activo.",
    );
  if (e.puntoId) {
    const p = await ctx.db.puntoControl.findFirst({
      where: { id: e.puntoId, instalacionId: e.instalacionId },
      select: { id: true },
    });
    if (!p) throw noEncontrado("El punto de control");
  }
  if (!e.tipoIncidenteId) return undefined;
  const t = await ctx.db.tipoIncidente.findFirst({
    where: { id: e.tipoIncidenteId, activo: true },
    select: { gravedadDefecto: true },
  });
  if (!t) throw noEncontrado("El tipo de incidente");
  return t.gravedadDefecto;
}

/** Registrar una novedad en línea (ERP, portal o agente) en el libro de una instalación (CAR-77 parte 2). */
export const libroNovedadesRegistrar = defineCapability({
  id: "core.libro_novedades.registrar",
  descripcion:
    "Registra una novedad en el libro de una instalación: resumen, detalle y gravedad (alta = incidente), opcionalmente enlazada a un punto o tipo de incidente de Rondas. Queda abierta, con número NOV y autor.",
  permiso: PERMISOS_CORE.novedadesManage,
  input,
  output: z.object({ aplicado: z.boolean(), novedad: novedadSchema.nullable() }),
  efecto: "escritura",
  dryRun: true,
  auditoriaPayload: (_ctx, e) => ({ instalacionId: e.instalacionId, gravedad: e.gravedad ?? null }),
  async handler(ctx, e, { dryRun }) {
    const inst = await ctx.db.instalacion.findFirst({
      where: { AND: [{ id: e.instalacionId }, dondeInstalacion(ctx)] },
      select: { id: true },
    });
    if (!inst) throw noEncontrado("La instalación");
    const gravedad = (await gravedadDeRondas(ctx, e).then((g) => e.gravedad ?? g)) ?? "media";
    if (dryRun) return { aplicado: false, novedad: null };
    const n = await ctx.transaccion(async (tx) => {
      const fila = await tx.libroNovedad.create({
        data: {
          tenantId: ctx.tenantId,
          instalacionId: e.instalacionId,
          modulo: "terreno",
          origen: e.puntoId ? "punto" : "manual",
          puntoId: e.puntoId ?? null,
          tipoIncidenteId: e.tipoIncidenteId ?? null,
          gravedad,
          resumen: e.resumen,
          detalle: e.detalle ?? null,
          usuarioId: quien(ctx),
        },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "core.libro_novedades.registrada",
        entidadTipo: "libro_novedad",
        entidadId: fila.id,
        payload: {
          instalacionId: fila.instalacionId,
          numero: fila.numero,
          gravedad: fila.gravedad,
        },
      });
      return fila;
    });
    return { aplicado: true, novedad: vistaNovedad(n) };
  },
});
