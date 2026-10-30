import { z } from "zod";

import { rangoDias, serieVigente } from "@opai/domain";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { conflicto, reglaDeNegocio } from "../errores";
import { anotar } from "./anotar";
import { cargarSeries } from "./cargar";
import { aFechaDb, fechaIso, MAX_DIAS_EXCEPCION, PERMISO_WRITE, puestoParaPauta, rangoSchema } from "./comun";
import { nombresDePersonas } from "./nombres";
import { tipoExcepcionSchema } from "./vistas";

const crearInput = z
  .object({
    puestoId: uuidSchema,
    tipo: tipoExcepcionSchema,
    motivo: z.string().trim().min(3, "Cuenta brevemente el motivo.").max(200),
  })
  .and(rangoSchema);

const crearSalida = z.object({
  puestoId: z.string(),
  tipo: tipoExcepcionSchema,
  desde: z.string(),
  hasta: z.string(),
  /** Días registrados (los que caen fuera de la serie vigente se omiten). */
  dias: z.number().int(),
  /** Titulares a los que el sistema avisará (notificación, sin confirmar). */
  avisarA: z.array(z.string()),
});

function diasDelRango(desde: string, hasta: string | undefined): string[] {
  const dias = rangoDias(desde, hasta ?? desde);
  if (dias.length > MAX_DIAS_EXCEPCION)
    throw reglaDeNegocio(`Una excepción cubre como máximo ${MAX_DIAS_EXCEPCION} días seguidos.`);
  return dias;
}

/** Registra una ausencia, licencia, vacaciones o permiso: los turnos de esos días quedan PPC. */
export const excepcionesCrear = defineCapability({
  id: "pauta.excepciones.crear",
  descripcion:
    "Registra una excepción en la pauta de un puesto (ausencia, licencia, vacaciones o permiso, con motivo) para un día o un rango: sus turnos quedan como puesto por cubrir con ese motivo. Se puede registrar sobre días pasados y se anula sin borrar el historial.",
  permiso: PERMISO_WRITE,
  input: crearInput,
  output: crearSalida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const puesto = await puestoParaPauta(ctx, input.puestoId);
    const dias = diasDelRango(input.desde, input.hasta);
    const series = await cargarSeries(ctx, puesto.id);
    const cubiertos = dias.filter((f) => serieVigente(series, f));
    if (cubiertos.length === 0)
      throw reglaDeNegocio("El puesto no tiene serie en esas fechas: fija primero su serie.");
    const hasta = input.hasta ?? input.desde;
    const titulares = new Set(cubiertos.map((f) => serieVigente(series, f)?.titularId ?? null));
    const nombres = await nombresDePersonas(ctx, titulares);
    const salida = {
      puestoId: puesto.id,
      tipo: input.tipo,
      desde: input.desde,
      hasta,
      dias: cubiertos.length,
      avisarA: [...nombres.values()],
    };
    const repetidas = await ctx.db.excepcionPauta.findMany({
      where: { puestoId: puesto.id, estado: "activa", fecha: { in: cubiertos.map(aFechaDb) } },
      select: { fecha: true },
    });
    if (repetidas.length > 0)
      throw conflicto(
        `Ya hay una excepción activa el ${fechaIso(repetidas[0]!.fecha)}: anúlala antes de registrar otra.`,
      );
    if (dryRun) return salida;
    await ctx.transaccion(async (tx) => {
      await tx.excepcionPauta.createMany({
        data: cubiertos.map((f) => ({
          tenantId: ctx.tenantId,
          puestoId: puesto.id,
          fecha: aFechaDb(f),
          tipo: input.tipo,
          motivo: input.motivo,
          personaId: serieVigente(series, f)?.titularId ?? null,
          creadaPor: ctx.usuario?.id ?? null,
        })),
      });
      await anotar(tx, ctx, {
        instalacionId: puesto.instalacionId,
        puestoId: puesto.id,
        accion: "excepcion_creada",
        desde: input.desde,
        hasta,
        detalle: { tipo: input.tipo, motivo: input.motivo, dias: cubiertos.length },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "pauta.excepcion.creada",
        entidadTipo: "puesto",
        entidadId: puesto.id,
        payload: { puestoId: puesto.id, tipo: input.tipo, desde: input.desde, hasta },
      });
    });
    return salida;
  },
});

const anularInput = z.object({ puestoId: uuidSchema }).and(rangoSchema);

/** Anula las excepciones activas de un puesto en un rango: los turnos vuelven a la serie. */
export const excepcionesAnular = defineCapability({
  id: "pauta.excepciones.anular",
  descripcion:
    "Anula las excepciones activas de un puesto en un día o rango de la pauta: los turnos vuelven a cubrirse según su serie. La anulación queda en el historial.",
  permiso: PERMISO_WRITE,
  input: anularInput,
  output: z.object({ puestoId: z.string(), anuladas: z.number().int() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const puesto = await puestoParaPauta(ctx, input.puestoId);
    const dias = diasDelRango(input.desde, input.hasta);
    const donde = {
      puestoId: puesto.id,
      estado: "activa",
      fecha: { gte: aFechaDb(dias[0]!), lte: aFechaDb(dias[dias.length - 1]!) },
    };
    const activas = await ctx.db.excepcionPauta.count({ where: donde });
    if (dryRun) return { puestoId: puesto.id, anuladas: activas };
    if (activas === 0) throw reglaDeNegocio("No hay excepciones activas en esas fechas.");
    await ctx.transaccion(async (tx) => {
      await tx.excepcionPauta.updateMany({
        where: donde,
        data: { estado: "anulada", anuladaEn: new Date(), anuladaPor: ctx.usuario?.id ?? null },
      });
      await anotar(tx, ctx, {
        instalacionId: puesto.instalacionId,
        puestoId: puesto.id,
        accion: "excepcion_anulada",
        desde: input.desde,
        hasta: input.hasta ?? input.desde,
        detalle: { anuladas: activas },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "pauta.excepcion.anulada",
        entidadTipo: "puesto",
        entidadId: puesto.id,
        payload: { puestoId: puesto.id, desde: input.desde, hasta: input.hasta ?? input.desde },
      });
    });
    return { puestoId: puesto.id, anuladas: activas };
  },
});
