import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { conflicto, reglaDeNegocio } from "../errores";
import { anotar } from "./anotar";
import { celdaDelDia } from "./cargar";
import { aFechaDb, diaSchema, PERMISO_WRITE, puestoParaPauta } from "./comun";

const inputSchema = z.object({
  puestoId: uuidSchema,
  fecha: diaSchema,
  motivo: z.string().trim().min(3, "Cuenta brevemente el motivo.").max(200),
  personaId: uuidSchema.optional(),
});

const salidaSchema = z.object({ puestoId: z.string(), fecha: z.string(), marcaManual: z.literal(true) });

/** Registra una marca manual de presencia cuando no hay Asistencia integrada. */
export const marcaManual = defineCapability({
  id: "pauta.marca.registrar",
  descripcion:
    "Registra una marca manual de presencia en la pauta diaria de un puesto y fecha, con motivo, cuando aún no hay cruce con Asistencia.",
  permiso: PERMISO_WRITE,
  input: inputSchema,
  output: salidaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const puesto = await puestoParaPauta(ctx, input.puestoId);
    const celda = await celdaDelDia(ctx, puesto.id, input.fecha);
    if (celda.estado !== "cubierto" && celda.estado !== "ppc")
      throw reglaDeNegocio("Solo se puede marcar presencia en un día de turno o puesto por cubrir.");
    const personaId = input.personaId ?? celda.cubiertoPorId ?? celda.titularId;
    if (!personaId) throw reglaDeNegocio("Indica la persona que marcó presencia.");
    if (dryRun) return { puestoId: puesto.id, fecha: input.fecha, marcaManual: true as const };
    return ctx.transaccion(async (tx) => {
      await tx.$queryRaw`SELECT id FROM core.puestos WHERE id = ${input.puestoId}::uuid AND tenant_id = ${ctx.tenantId}::uuid FOR UPDATE`;
      const previa = await tx.registroOperativoPauta.findFirst({
        where: { puestoId: puesto.id, fecha: aFechaDb(input.fecha), estado: "activa", tipo: "marca_presencia" },
      });
      if (previa) throw conflicto("Ya hay una marca manual activa ese día.");
      await tx.registroOperativoPauta.create({
        data: {
          tenantId: ctx.tenantId,
          puestoId: puesto.id,
          fecha: aFechaDb(input.fecha),
          tipo: "marca_presencia",
          motivo: input.motivo,
          personaId,
          creadaPor: ctx.usuario?.id ?? null,
        },
      });
      await anotar(tx, ctx, {
        instalacionId: puesto.instalacionId,
        puestoId: puesto.id,
        accion: "marca_registrada",
        desde: input.fecha,
        hasta: input.fecha,
        detalle: { personaId },
      });
      return { puestoId: puesto.id, fecha: input.fecha, marcaManual: true as const };
    });
  },
});
