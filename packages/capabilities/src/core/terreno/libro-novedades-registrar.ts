import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import { uuidSchema } from "../esquemas";
import { dondeInstalacion } from "../maestros/alcance";
import { quien } from "./comun";
import {
  gravedadDeRondas,
  gravedadNovedadSchema,
  novedadSchema,
  vistaNovedad,
} from "./libro-novedades-comun";

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
  // El texto lo escribe una persona y puede traer datos personales: la auditoría no lo copia.
  sensibles: ["resumen", "detalle"],
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
