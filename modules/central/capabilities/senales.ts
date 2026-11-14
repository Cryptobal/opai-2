import { z } from "zod";

import { type Contexto, defineConsumidor } from "@opai/capabilities";

import { ESTADOS_ACTIVOS, type Severidad } from "../domain";
import { alertaParaAgrupar, masGrave, SENALES, senalDe } from "../domain/senales";
import { bloquearAlerta, TRABAJO_REVISAR } from "./motor";
import { registrarHecho } from "./util";

const payloadSchema = z.looseObject({
  instalacionId: z.uuid().optional(),
  personaId: z.uuid().optional(),
});

async function centralActiva(ctx: Contexto) {
  if (ctx.modulosActivos.includes("central")) return true;
  const m = await ctx.db.tenantModule.findFirst({
    where: { tenantId: ctx.tenantId, moduloId: "central", estado: { in: ["activo", "trial"] } },
    select: { id: true },
  });
  return m !== null;
}

/** Instalación de la señal: la del evento o, si no viene, la del vínculo vigente de la persona. */
async function instalacionDe(ctx: Contexto, instalacionId: string | undefined, personaId: string | null) {
  if (instalacionId) {
    const i = await ctx.db.instalacion.findFirst({ where: { id: instalacionId }, select: { id: true } });
    return i?.id ?? null;
  }
  if (!personaId) return null;
  const v = await ctx.db.vinculoLaboral.findFirst({
    where: { personaId, estado: "vigente", instalacionId: { not: null } },
    orderBy: { inicio: "desc" },
    select: { instalacionId: true },
  });
  return v?.instalacionId ?? null;
}

/**
 * Convierte la señal de un módulo en una alerta de la central (R1–R5): si la regla está activa, la
 * suma a una alerta abierta de la misma instalación y persona (R4, R4a) o abre una nueva, que inicia
 * su cadena. Idempotente por evento: un reintento del despacho no repite la señal.
 */
export const consumidorSenales = defineConsumidor({
  id: "central.senales.recibir",
  descripcion: "Abre o agrupa alertas en la central a partir de las señales de Asistencia y Rondas.",
  eventos: SENALES.map((s) => s.evento),
  async handler(ctx, ev) {
    const senal = senalDe(ev.tipo);
    const p = payloadSchema.safeParse(ev.payload);
    if (!senal || !p.success || !(await centralActiva(ctx))) return;
    const regla = await ctx.db.centralRegla.findFirst({ where: { evento: senal.evento } });
    if (regla && !regla.activa && !senal.fija) return;
    const severidad = (senal.fija ? senal.severidad : (regla?.severidad ?? senal.severidad)) as Severidad;
    const persona = p.data.personaId
      ? await ctx.db.persona.findFirst({ where: { id: p.data.personaId }, select: { id: true } })
      : null;
    const personaId = persona?.id ?? null;
    // La instalación y la persona se validan en la empresa: un id ajeno no abre nada.
    const instalacionId = await instalacionDe(ctx, p.data.instalacionId, personaId);
    if (!instalacionId) return;
    await ctx.transaccion(async (tx) => {
      if (await tx.centralAlertaEvento.findFirst({ where: { tipo: "senal", nota: { startsWith: `${ev.id} ` } } })) return;
      const abiertas = await tx.centralAlerta.findMany({
        where: { instalacionId, personaId, estado: { in: [...ESTADOS_ACTIVOS, "pospuesta"] } },
      });
      const candidata = alertaParaAgrupar(abiertas, { instalacionId, personaId, evento: senal.evento }, new Date());
      // Se bloquea y se relee: si un operador la cerró entretanto, se abre una nueva.
      const releida = candidata ? await bloquearAlerta(ctx, tx, candidata.id) : null;
      const destino = releida && [...ESTADOS_ACTIVOS, "pospuesta"].includes(releida.estado) ? releida : null;
      const nota = `${ev.id} ${senal.nombre}`;
      if (destino) {
        const nueva = masGrave(destino.severidad as Severidad, severidad);
        // Una pospuesta vuelve a la cola apenas llega una señal nueva (R4a).
        const estado = (destino.estado === "pospuesta" ? (destino.estadoPrevio ?? "nueva") : destino.estado) as (typeof ESTADOS_ACTIVOS)[number];
        const pospuesta = destino.estado === "pospuesta";
        await tx.centralAlerta.update({
          where: { id: destino.id },
          data: pospuesta ? { severidad: nueva, estado, estadoPrevio: null, pospuestaHasta: null } : { severidad: nueva },
        });
        if (pospuesta) {
          await registrarHecho(ctx, tx, { alertaId: destino.id, tipo: "reactivada", estadoDesde: "pospuesta", estadoHacia: estado, sistema: true });
          await ctx.trabajos.encolar(tx, { tipo: TRABAJO_REVISAR, payload: { alertaId: destino.id }, programadoPara: new Date(), claveUnica: `${destino.id}:senal:${ev.id}` });
        }
        await registrarHecho(ctx, tx, { alertaId: destino.id, tipo: "senal", estadoDesde: estado, estadoHacia: estado, nota, sistema: true });
        return;
      }
      const a = await tx.centralAlerta.create({
        data: { tenantId: ctx.tenantId, instalacionId, personaId, titulo: senal.nombre, severidad, origen: senal.evento },
      });
      await registrarHecho(ctx, tx, { alertaId: a.id, tipo: "abierta", estadoDesde: null, estadoHacia: "nueva", sistema: true });
      await registrarHecho(ctx, tx, { alertaId: a.id, tipo: "senal", estadoDesde: "nueva", estadoHacia: "nueva", nota, sistema: true });
      await ctx.eventos.emitir(tx, {
        tipo: "central.alerta.abierta",
        entidadTipo: "central.alerta",
        entidadId: a.id,
        payload: { instalacionId, severidad, origen: senal.evento },
      });
    });
  },
});
