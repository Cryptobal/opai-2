import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { sinDuplicado } from "../core/maestros/comun";
import { defineCapability } from "../define";
import { conflicto, reglaDeNegocio } from "../errores";
import { anotar } from "./anotar";
import { celdaDelDia } from "./cargar";
import { aFechaDb, diaSchema, PERMISO_WRITE, puestoParaPauta } from "./comun";

const inputSchema = z.object({ puestoId: uuidSchema, fecha: diaSchema });
const salidaSchema = z.object({ puestoId: z.string(), fecha: z.string(), confirmado: z.literal(true) });

/** Confirma la cobertura operativa de un día (no sustituye marca legal de Asistencia). */
export const coberturaConfirmar = defineCapability({
  id: "pauta.cobertura.confirmar",
  descripcion:
    "Confirma en la pauta diaria que un turno quedó cubierto en un puesto y fecha: registra una cobertura confirmada sin borrar la serie ni las excepciones.",
  permiso: PERMISO_WRITE,
  input: inputSchema,
  output: salidaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const puesto = await puestoParaPauta(ctx, input.puestoId);
    const celda = await celdaDelDia(ctx, puesto.id, input.fecha);
    if (celda.estado !== "cubierto")
      throw reglaDeNegocio("Solo se puede confirmar un día que esté cubierto en la pauta.");
    if (celda.confirmado) throw conflicto("Ese día ya tiene cobertura confirmada.");
    if (dryRun) return { puestoId: puesto.id, fecha: input.fecha, confirmado: true as const };
    return ctx.transaccion(async (tx) => {
      await tx.$queryRaw`SELECT id FROM core.puestos WHERE id = ${input.puestoId}::uuid AND tenant_id = ${ctx.tenantId}::uuid FOR UPDATE`;
      const otra = await tx.registroOperativoPauta.findFirst({
        where: { puestoId: puesto.id, fecha: aFechaDb(input.fecha), estado: "activa", tipo: "cobertura_confirmada" },
      });
      if (otra) throw conflicto("Ese día ya tiene cobertura confirmada.");
      await sinDuplicado(
        tx.registroOperativoPauta.create({
          data: {
            tenantId: ctx.tenantId,
            puestoId: puesto.id,
            fecha: aFechaDb(input.fecha),
            tipo: "cobertura_confirmada",
            creadaPor: ctx.usuario?.id ?? null,
          },
        }),
        "Ese día ya tiene cobertura confirmada.",
      );
      await anotar(tx, ctx, {
        instalacionId: puesto.instalacionId,
        puestoId: puesto.id,
        accion: "cobertura_confirmada",
        desde: input.fecha,
        hasta: input.fecha,
        detalle: {},
      });
      return { puestoId: puesto.id, fecha: input.fecha, confirmado: true as const };
    });
  },
});
