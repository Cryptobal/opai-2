import type { z } from "zod";

import { serieVigente, trabajaEn } from "@opai/domain";

import { claseValida } from "../core/maestros/ausencias-clases";
import { sinDuplicado } from "../core/maestros/comun";
import { defineCapability } from "../define";
import { conflicto, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { anotar } from "./anotar";
import { registrarDesdePauta } from "./ausencias-registro";
import { cargarSeries } from "./cargar";
import { aFechaDb, diasDelRango, fechaIso, PERMISO_WRITE, puestoParaPauta } from "./comun";
import { nombresDePersonas } from "./nombres";
import { crearInput, crearSalida } from "./excepciones-crear-esquemas";

type Entrada = z.output<typeof crearInput>;

/** Valida el rango contra la serie vigente y arma lo que se registra; sirve a la vista previa y a la real. */
async function planear(ctx: Contexto, i: Entrada) {
  const puesto = await puestoParaPauta(ctx, i.puestoId);
  const clase = await claseValida(ctx, i.tipo, i.clase);
  const series = await cargarSeries(ctx, puesto.id);
  // Solo cuentan los días de turno según la serie vigente: un día libre no tiene qué quedar por cubrir.
  const dias = diasDelRango(i.desde, i.hasta).flatMap((f) => {
    const s = serieVigente(series, f);
    return s && trabajaEn(s.patron, s.inicioCiclo, f) ? [{ fecha: f, personaId: s.titularId }] : [];
  });
  if (dias.length === 0)
    throw reglaDeNegocio(
      series.length === 0
        ? "El puesto no tiene serie: fija primero su serie."
        : "Ningún día de ese rango es de turno según la serie del puesto.",
    );
  const repetida = await ctx.db.excepcionPauta.findFirst({
    where: {
      puestoId: puesto.id,
      estado: "activa",
      fecha: { in: dias.map((d) => aFechaDb(d.fecha)) },
    },
    select: { fecha: true },
  });
  if (repetida)
    throw conflicto(
      `Ya hay una excepción activa el ${fechaIso(repetida.fecha)}: anúlala antes de registrar otra.`,
    );
  const nombres = await nombresDePersonas(
    ctx,
    dias.map((d) => d.personaId),
  );
  return { puesto, dias, clase, avisarA: [...nombres.values()] };
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
    const hasta = input.hasta ?? input.desde;
    const salida = (p: Awaited<ReturnType<typeof planear>>) => ({
      puestoId: p.puesto.id,
      tipo: input.tipo,
      desde: input.desde,
      hasta,
      dias: p.dias.length,
      avisarA: p.avisarA,
    });
    if (dryRun) return salida(await planear(ctx, input));
    return ctx.transaccion(async (tx) => {
      // Un puesto a la vez: bloquea la fila y revalida dentro (serie, días libres y repeticiones).
      await tx.$queryRaw`SELECT id FROM core.puestos WHERE id = ${input.puestoId}::uuid AND tenant_id = ${ctx.tenantId}::uuid FOR UPDATE`;
      const plan = await planear({ ...ctx, db: tx }, input);
      // Cada titular afectado queda con su registro de ausencia (CAR-393), en el mismo instante que sus turnos.
      const ahora = new Date();
      const registros = await registrarDesdePauta(tx, {
        tenantId: ctx.tenantId,
        tipo: input.tipo,
        motivo: input.motivo,
        clase: plan.clase,
        usuarioId: ctx.usuario?.id ?? null,
        ahora,
        dias: plan.dias.map((d) => ({ fecha: aFechaDb(d.fecha), personaId: d.personaId })),
      });
      await sinDuplicado(
        tx.excepcionPauta.createMany({
          data: plan.dias.map((d) => ({
            tenantId: ctx.tenantId,
            puestoId: plan.puesto.id,
            fecha: aFechaDb(d.fecha),
            tipo: input.tipo,
            motivo: input.motivo,
            clase: plan.clase,
            personaId: d.personaId,
            ausenciaId: d.personaId ? (registros.get(d.personaId) ?? null) : null,
            creadaPor: ctx.usuario?.id ?? null,
            createdAt: ahora,
          })),
        }),
        "Ya hay una excepción activa en alguno de esos días: anúlala antes de registrar otra.",
      );
      // El historial no copia el motivo (texto libre que puede ser de salud): queda en la excepción.
      await anotar(tx, ctx, {
        instalacionId: plan.puesto.instalacionId,
        puestoId: plan.puesto.id,
        accion: "excepcion_creada",
        desde: input.desde,
        hasta,
        detalle: { tipo: input.tipo, dias: plan.dias.length },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "pauta.excepcion.creada",
        entidadTipo: "puesto",
        entidadId: plan.puesto.id,
        payload: { puestoId: plan.puesto.id, tipo: input.tipo, desde: input.desde, hasta },
      });
      return salida(plan);
    });
  },
});
