import { z } from "zod";

import { defineCapability } from "../define";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { uuidSchema } from "../core/esquemas";
import { bloquearPeriodoAbierto } from "./bloqueos";
import { PERMISO_NOVEDADES, periodoDe } from "./comun";
import { datosNovedad, exigirPeriodoAbierto, novedadEntradaSchema } from "./novedades-util";
import { nombresDe, novedadSchema, vistaNovedad } from "./novedades-vista";

/** Registra una novedad de un período. */
export const novedadesCrear = defineCapability({
  id: "nomina.novedades.crear",
  descripcion:
    "Registra una novedad en un período de remuneraciones abierto o en revisión: licencia o ausencia (en días), horas extra (en horas), anticipo o descuento (en pesos), con respaldo documental opcional. Las cuotas de préstamo no se cargan aquí: salen del plan del préstamo.",
  permiso: PERMISO_NOVEDADES,
  input: novedadEntradaSchema.extend({ periodoId: uuidSchema }),
  output: novedadSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { periodoId, ...entrada }, { dryRun }) {
    const periodo = await periodoDe(ctx, periodoId);
    exigirPeriodoAbierto(periodo);
    const data = await datosNovedad(ctx, periodo, entrada, "manual");
    const nombres = await nombresDe(ctx.db, [entrada.personaId]);
    if (dryRun) return vistaNovedad({ ...data, id: "" }, nombres);
    return ctx.transaccion(async (tx) => {
      await bloquearPeriodoAbierto(tx, ctx.tenantId, periodoId);
      const creada = await tx.nominaNovedad.create({ data });
      await ctx.eventos.emitir(tx, {
        tipo: "nomina.novedad.registrada",
        entidadTipo: "novedad",
        entidadId: creada.id,
        payload: { periodoId, tipo: entrada.tipo },
      });
      return vistaNovedad(creada, nombres);
    });
  },
});

/** Carga masiva: todo o nada, hasta 200 novedades de un mismo período. */
export const novedadesCargar = defineCapability({
  id: "nomina.novedades.cargar",
  descripcion:
    "Carga masiva de novedades en un período abierto o en revisión: hasta 200 filas de licencia, ausencia, horas extra, anticipo o descuento. Se valida todo antes de guardar; si una fila falla, no se guarda ninguna y el error indica cuál.",
  permiso: PERMISO_NOVEDADES,
  input: z.object({
    periodoId: uuidSchema,
    novedades: z.array(novedadEntradaSchema).min(1).max(200),
  }),
  output: z.object({ creadas: z.number().int(), novedades: z.array(novedadSchema) }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { periodoId, novedades }, { dryRun }) {
    const periodo = await periodoDe(ctx, periodoId);
    exigirPeriodoAbierto(periodo);
    const ids = [...new Set(novedades.map((n) => n.personaId))];
    const existentes = await ctx.db.persona.findMany({ where: { id: { in: ids } }, select: { id: true } });
    const validas = new Set(existentes.map((p) => p.id));
    const datos: Awaited<ReturnType<typeof datosNovedad>>[] = [];
    for (const [i, n] of novedades.entries()) {
      try {
        datos.push(await datosNovedad(ctx, periodo, n, "carga_masiva", validas));
      } catch (e) {
        const mensaje = e instanceof Error ? e.message : "fila inválida";
        throw reglaDeNegocio(`Fila ${i + 1}: ${mensaje}`);
      }
    }
    const nombres = await nombresDe(ctx.db, ids);
    if (dryRun)
      return { creadas: datos.length, novedades: datos.map((d, i) => vistaNovedad({ ...d, id: `${i}` }, nombres)) };
    return ctx.transaccion(async (tx) => {
      await bloquearPeriodoAbierto(tx, ctx.tenantId, periodoId);
      const creadas = [];
      for (const d of datos) creadas.push(await tx.nominaNovedad.create({ data: d }));
      await ctx.eventos.emitir(tx, {
        tipo: "nomina.novedad.registrada",
        entidadTipo: "periodo",
        entidadId: periodoId,
        payload: { periodoId, cantidad: creadas.length, origen: "carga_masiva" },
      });
      return { creadas: creadas.length, novedades: creadas.map((c) => vistaNovedad(c, nombres)) };
    });
  },
});

/** Anula una novedad con motivo (no se borra). */
export const novedadesAnular = defineCapability({
  id: "nomina.novedades.anular",
  descripcion:
    "Anula una novedad vigente de un período abierto o en revisión, con un motivo. La novedad queda en el historial como anulada y no se vuelve a generar. Las cuotas de préstamo se cancelan desde el préstamo.",
  permiso: PERMISO_NOVEDADES,
  input: z.object({ id: uuidSchema, motivo: z.string().trim().min(5).max(300) }),
  output: novedadSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, motivo }, { dryRun }) {
    const n = await ctx.db.nominaNovedad.findUnique({ where: { id } });
    if (!n) throw noEncontrado("La novedad");
    exigirPeriodoAbierto(await periodoDe(ctx, n.periodoId));
    if (n.estado === "anulada") throw reglaDeNegocio("La novedad ya está anulada.");
    if (n.origen === "prestamo_cuota")
      throw reglaDeNegocio("Una cuota de préstamo se gestiona desde el préstamo.");
    const nombres = await nombresDe(ctx.db, [n.personaId]);
    if (dryRun) return vistaNovedad({ ...n, estado: "anulada", motivoAnulacion: motivo }, nombres);
    return ctx.transaccion(async (tx) => {
      await bloquearPeriodoAbierto(tx, ctx.tenantId, n.periodoId);
      const vigente = await tx.nominaNovedad.findUnique({ where: { id } });
      if (!vigente || vigente.estado === "anulada") throw reglaDeNegocio("La novedad ya está anulada.");
      const nueva = await tx.nominaNovedad.update({
        where: { id },
        data: { estado: "anulada", anuladaEn: new Date(), motivoAnulacion: motivo },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "nomina.novedad.anulada",
        entidadTipo: "novedad",
        entidadId: id,
        payload: { periodoId: n.periodoId, tipo: n.tipo },
      });
      return vistaNovedad(nueva, nombres);
    });
  },
});
