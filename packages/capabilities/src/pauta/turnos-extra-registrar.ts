import { z } from "zod";

import { montoSugeridoTurnoExtra, TIPOS_TRABAJADOR } from "@opai/domain";

import { uuidSchema } from "../core/esquemas";
import { dondePuesto } from "../core/maestros/alcance";
import { sinDuplicado } from "../core/maestros/comun";
import { defineCapability } from "../define";
import { conflicto, noEncontrado, reglaDeNegocio } from "../errores";
import { fechaIso, PERMISO_WRITE } from "./comun";
import { turnoExtraSchema, vistaTurnoExtra } from "./turnos-extra-comun";

/** Registra el turno extra de un reemplazo o refuerzo (CAR-96): queda por aprobar con el monto sugerido. */
export const turnosExtraRegistrar = defineCapability({
  id: "pauta.turnos_extra.registrar",
  descripcion:
    "Registra como turno extra un reemplazo o refuerzo de la pauta, indicando si lo hizo un trabajador propio o un externo. El monto sugerido sale del monto fijo de la instalación o de la excepción del puesto y no se edita aquí; queda por aprobar. No mueve plata ni se informa a Nómina.",
  permiso: PERMISO_WRITE,
  input: z.object({
    excepcionId: uuidSchema.describe("El reemplazo o refuerzo de la pauta (excepción activa)."),
    tipoTrabajador: z.enum(TIPOS_TRABAJADOR),
  }),
  output: turnoExtraSchema.extend({ sinMontoConfigurado: z.boolean() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const usuarioId = ctx.usuario?.id;
    if (!usuarioId) throw reglaDeNegocio("Registrar un turno extra exige una persona responsable.");
    const exc = await ctx.db.excepcionPauta.findFirst({
      where: { id: input.excepcionId, estado: "activa", tipo: { in: ["reemplazo", "refuerzo"] } },
      select: { id: true, puestoId: true, fecha: true, personaId: true },
    });
    const puesto = exc
      ? await ctx.db.puesto.findFirst({ where: { id: exc.puestoId, AND: [dondePuesto(ctx)] }, select: { id: true, instalacionId: true } })
      : null;
    if (!exc || !puesto || !exc.personaId) throw noEncontrado("El reemplazo o refuerzo");
    if (await ctx.db.turnoExtra.findFirst({ where: { excepcionId: exc.id }, select: { id: true } }))
      throw conflicto("Ese reemplazo o refuerzo ya tiene turno extra.");
    const montos = await ctx.db.montoTurnoExtra.findMany({
      where: { instalacionId: puesto.instalacionId, OR: [{ puestoId: null }, { puestoId: puesto.id }] },
      select: { puestoId: true, montoClp: true },
    });
    const sugerido = montoSugeridoTurnoExtra(montos, puesto.id);
    const datos = {
      tenantId: ctx.tenantId,
      excepcionId: exc.id,
      instalacionId: puesto.instalacionId,
      puestoId: puesto.id,
      personaId: exc.personaId,
      fecha: exc.fecha,
      tipoTrabajador: input.tipoTrabajador,
      montoSugeridoClp: sugerido ?? 0,
      montoClp: sugerido ?? 0,
      registradoPor: usuarioId,
    };
    const extra = { sinMontoConfigurado: sugerido === null };
    if (dryRun)
      return {
        ...vistaTurnoExtra({ ...datos, id: "", montoMotivo: null, estado: "por_aprobar", resueltoPor: null, resueltoEn: null, motivoResolucion: null, createdAt: new Date() }),
        ...extra,
      };
    return ctx.transaccion(async (tx) => {
      const t = await sinDuplicado(tx.turnoExtra.create({ data: datos }), "Ese reemplazo o refuerzo ya tiene turno extra.");
      await ctx.eventos.emitir(tx, {
        tipo: "pauta.turno_extra.registrado",
        entidadTipo: "turno_extra",
        entidadId: t.id,
        payload: { turnoExtraId: t.id, instalacionId: t.instalacionId, puestoId: t.puestoId, fecha: fechaIso(t.fecha) },
      });
      return { ...vistaTurnoExtra(t), ...extra };
    });
  },
});
