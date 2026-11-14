import { z } from "zod";

import { conflicto, defineCapability, noEncontrado, reglaDeNegocio } from "@opai/capabilities";

import { personaPropia, usuarioDe } from "./persona-propia";
import { hoyDeLaEmpresa, solicitudInput, solicitudSchema, vistaSolicitud } from "./solicitudes-comun";

const aFecha = (d: string) => new Date(`${d}T00:00:00Z`);

/**
 * El trabajador pide un permiso o vacaciones desde su portal (CAR-464): queda un registro de ausencia de su propia
 * persona en estado «solicitada», que su jefatura aprueba o rechaza en el ERP. Pedir no marca turnos en la pauta: eso
 * pasa al aprobar. Ningún input trae un id de persona (ADR-022).
 */
export const solicitudesCrear = defineCapability({
  id: "portal_trabajador.solicitudes.crear",
  descripcion:
    "El trabajador pide un permiso o vacaciones para un día o un rango de fechas, con un motivo breve. Queda como solicitud pendiente de su propia persona hasta que la jefatura la apruebe o rechace; no cambia la pauta mientras tanto. Acepta vista previa.",
  permiso: null,
  portales: ["trabajador"],
  input: solicitudInput,
  output: solicitudSchema,
  efecto: "escritura",
  // El motivo es texto libre: no llega en claro a la auditoría (igual que core.ausencias, CAR-393) ni a la tabla de
  // idempotencia.
  sensibles: ["motivo"],
  salidaIdempotente: (s) => ({ ...s, motivo: "[oculto]" }),
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const persona = await personaPropia(ctx);
    const usuarioId = usuarioDe(ctx);
    if (input.desde < (await hoyDeLaEmpresa(ctx))) throw reglaDeNegocio("No puedes pedir días que ya pasaron.");
    const datos = {
      tenantId: ctx.tenantId,
      personaId: persona.id,
      tipo: input.tipo,
      desde: aFecha(input.desde),
      hasta: aFecha(input.hasta),
      motivo: input.motivo,
      estado: "solicitada",
      registradaPor: usuarioId,
    };
    const chocaEn = async (db: typeof ctx.db) => {
      const choca = await db.ausencia.findFirst({
        where: {
          personaId: persona.id,
          estado: { in: ["solicitada", "aprobada"] },
          desde: { lte: datos.hasta },
          hasta: { gte: datos.desde },
        },
        select: { id: true },
      });
      if (choca) throw conflicto("Ya tienes un permiso, vacaciones o solicitud en esas fechas.");
    };
    if (dryRun) {
      await chocaEn(ctx.db);
      return vistaSolicitud({ ...datos, id: "vista-previa", clase: null, createdAt: new Date() }, usuarioId);
    }
    const creada = await ctx.transaccion(async (tx) => {
      // Mismo candado por persona que la pauta y RR. HH. (CAR-393): dos pedidos a la vez no quedan superpuestos.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`pauta:${ctx.tenantId}:${persona.id}`}, 0))::text`;
      await chocaEn(tx);
      const a = await tx.ausencia.create({ data: datos });
      await ctx.eventos.emitir(tx, {
        tipo: "portal_trabajador.solicitud.creada",
        entidadTipo: "ausencia",
        entidadId: a.id,
        payload: { personaId: persona.id, tipo: a.tipo },
      });
      return a;
    });
    return vistaSolicitud(creada, usuarioId);
  },
});

/** El trabajador retira una solicitud suya que todavía no se resuelve. */
export const solicitudesCancelar = defineCapability({
  id: "portal_trabajador.solicitudes.cancelar",
  descripcion:
    "El trabajador retira un permiso o vacaciones que pidió y que su jefatura todavía no resuelve. Una solicitud ya aprobada o rechazada no se puede retirar desde el portal. Acepta vista previa.",
  permiso: null,
  portales: ["trabajador"],
  input: z.object({ id: z.uuid() }),
  output: solicitudSchema,
  efecto: "escritura",
  salidaIdempotente: (s) => ({ ...s, motivo: "[oculto]" }),
  dryRun: true,
  async handler(ctx, { id }, { dryRun }) {
    const persona = await personaPropia(ctx);
    const usuarioId = usuarioDe(ctx);
    const a = await ctx.db.ausencia.findFirst({ where: { id, personaId: persona.id, registradaPor: usuarioId } });
    if (!a) throw noEncontrado("La solicitud");
    if (a.estado !== "solicitada") throw reglaDeNegocio("Esa solicitud ya fue resuelta: habla con tu jefatura.");
    const cambio = { estado: "anulada", anuladaPor: usuarioId, anuladaEn: new Date() };
    if (dryRun) return vistaSolicitud({ ...a, ...cambio }, usuarioId);
    await ctx.transaccion(async (tx) => {
      const r = await tx.ausencia.updateMany({ where: { id, estado: "solicitada" }, data: cambio });
      if (r.count !== 1) throw conflicto("La solicitud cambió. Recarga y vuelve a intentarlo.");
      await ctx.eventos.emitir(tx, {
        tipo: "portal_trabajador.solicitud.retirada",
        entidadTipo: "ausencia",
        entidadId: id,
        payload: { personaId: persona.id, tipo: a.tipo },
      });
    });
    return vistaSolicitud({ ...a, ...cambio }, usuarioId);
  },
});
