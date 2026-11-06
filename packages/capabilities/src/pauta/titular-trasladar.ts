import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { aFechaDb, diaSchema, PERMISO_WRITE } from "./comun";
import { salidaSerieSchema } from "./series-nucleo";
import { planificarTraslado } from "./titular-trasladar-plan";

export const entradaTraslado = z.object({
  personaId: uuidSchema,
  puestoDestinoId: uuidSchema,
  /** Rige desde: el guardia empieza en el puesto nuevo y la serie y el vínculo anteriores se cierran el día antes. */
  desde: diaSchema,
  inicioCiclo: diaSchema,
  motivo: z.string().trim().min(5).max(500),
  /** Solo si el vínculo actual no tiene jornada pactada y el traslado es a otra instalación: el vínculo nuevo la exige. */
  horasSemanales: z.number().int().min(1).max(168).optional(),
  distribucion: z.string().trim().min(1).max(200).optional(),
});

export const salidaTraslado = z.object({
  personaId: z.string(),
  mismaInstalacion: z.boolean(),
  puestosOrigen: z.array(z.object({ puestoId: z.string(), puesto: z.string(), serieHasta: z.string() })),
  vinculoTerminado: z.object({ id: z.string(), termino: z.string() }).nullable(),
  vinculoNuevo: z.boolean(),
  /** true si el vínculo nuevo necesita la jornada pactada (horas y distribución) y el actual no la tiene: la vista previa se muestra, pero no se puede confirmar sin ella. */
  faltaJornada: z.boolean(),
  /** Titular del puesto de destino que deja de serlo con este traslado; null si estaba sin titular. */
  titularDesplazado: z.object({ id: z.string(), nombre: z.string() }).nullable(),
  serie: salidaSerieSchema.shape.serie,
  primerosDias: z.array(z.object({ fecha: z.string(), trabaja: z.boolean() })),
});

/** Traslada a un guardia a otro puesto (de la misma instalación o de otra) en una sola transacción. */
export const titularTrasladar = defineCapability({
  id: "pauta.titular.trasladar",
  descripcion:
    "IRREVERSIBLE: traslada a un guardia a otro puesto desde una fecha. Cierra sus series de pauta anteriores, y si el puesto es de otra instalación (rige desde hoy) termina su vínculo el día antes y crea el nuevo, con borrador de anexo para RR. HH.; luego lo deja como titular del puesto nuevo, y avisa si desplaza a otro titular. La vista previa muestra lo que se cierra, el vínculo y los primeros días.",
  permiso: PERMISO_WRITE,
  input: entradaTraslado,
  output: salidaTraslado,
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    if (dryRun) return planificarTraslado(ctx, i, null);
    return ctx.transaccion(async (tx) => {
      // Mismo orden de locks que `fijarSerieInterna` (persona, luego puestos por id) y antes de leer o escribir nada.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`pauta:${ctx.tenantId}:${i.personaId}`}, 0))::text`;
      const series = await tx.seriePauta.findMany({
        where: { titularPersonaId: i.personaId, OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: aFechaDb(i.desde) } }] },
        select: { puestoId: true },
      });
      const ids = [...new Set([i.puestoDestinoId, ...series.map((s) => s.puestoId)])].sort();
      await tx.$queryRaw`SELECT id FROM core.puestos WHERE id = ANY(${ids}::uuid[]) AND tenant_id = ${ctx.tenantId}::uuid ORDER BY id FOR UPDATE`;
      return planificarTraslado({ ...ctx, db: tx }, i, tx);
    });
  },
});
