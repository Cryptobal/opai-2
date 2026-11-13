import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { dondePuesto } from "../core/maestros/alcance";
import { defineCapability } from "../define";
import { reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { anotar } from "./anotar";
import { personaParaAusencia } from "./ausencias-plan";
import { aFechaDb, diasDelRango, PERMISO_WRITE, rangoSchema } from "./comun";
import { tipoExcepcionSchema } from "./vistas";

const anularInput = z.object({ personaId: uuidSchema, tipo: tipoExcepcionSchema }).and(rangoSchema);
type Entrada = z.output<typeof anularInput>;

/** Excepciones activas de la persona, de ese tipo y en ese rango, solo en puestos del alcance (ADR-022). */
async function activas(ctx: Contexto, i: Entrada) {
  await personaParaAusencia(ctx, i.personaId);
  const dias = diasDelRango(i.desde, i.hasta);
  const filas = await ctx.db.excepcionPauta.findMany({
    where: {
      personaId: i.personaId,
      tipo: i.tipo,
      estado: "activa",
      fecha: { gte: aFechaDb(dias[0]!), lte: aFechaDb(dias[dias.length - 1]!) },
    },
    select: { id: true, puestoId: true },
  });
  const enAlcance = await ctx.db.puesto.findMany({
    where: { id: { in: [...new Set(filas.map((f) => f.puestoId))] }, AND: [dondePuesto(ctx)] },
    select: { id: true, instalacionId: true },
    orderBy: { id: "asc" },
  });
  const ids = new Set(enAlcance.map((p) => p.id));
  return { filas: filas.filter((f) => ids.has(f.puestoId)), puestos: enAlcance };
}

/** Anula un permiso, licencia, vacaciones o ausencia de una persona: sus turnos vuelven a cubrirse según la serie. */
export const ausenciasAnular = defineCapability({
  id: "pauta.ausencias.anular",
  descripcion:
    "Anula los permisos, licencias, vacaciones o ausencias activos de una persona, de un tipo y en un día o rango: sus turnos vuelven a cubrirse según la serie, en todos sus puestos. No toca excepciones de otras personas y la anulación queda en el historial.",
  permiso: PERMISO_WRITE,
  input: anularInput,
  output: z.object({ personaId: z.string(), anuladas: z.number().int() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (dryRun)
      return { personaId: input.personaId, anuladas: (await activas(ctx, input)).filas.length };
    return ctx.transaccion(async (tx) => {
      const tctx = { ...ctx, db: tx };
      const previo = await activas(tctx, input);
      for (const p of previo.puestos)
        await tx.$queryRaw`SELECT id FROM core.puestos WHERE id = ${p.id}::uuid AND tenant_id = ${ctx.tenantId}::uuid FOR UPDATE`;
      const { filas, puestos } = await activas(tctx, input);
      if (filas.length === 0)
        throw reglaDeNegocio("No hay registros activos de ese tipo en esas fechas.");
      const r = await tx.excepcionPauta.updateMany({
        where: { id: { in: filas.map((f) => f.id) }, estado: "activa" },
        data: { estado: "anulada", anuladaEn: new Date(), anuladaPor: ctx.usuario?.id ?? null },
      });
      for (const p of puestos.filter((x) => filas.some((f) => f.puestoId === x.id))) {
        await anotar(tx, ctx, {
          instalacionId: p.instalacionId,
          puestoId: p.id,
          accion: "excepcion_anulada",
          desde: input.desde,
          hasta: input.hasta ?? input.desde,
          detalle: { tipo: input.tipo, dias: filas.filter((f) => f.puestoId === p.id).length },
        });
        await ctx.eventos.emitir(tx, {
          tipo: "pauta.excepcion.anulada",
          entidadTipo: "puesto",
          entidadId: p.id,
          payload: { puestoId: p.id, desde: input.desde, hasta: input.hasta ?? input.desde },
        });
      }
      return { personaId: input.personaId, anuladas: r.count };
    });
  },
});
