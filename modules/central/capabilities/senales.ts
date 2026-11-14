import { z } from "zod";

import { type Contexto, defineConsumidor } from "@opai/capabilities";

import { ESTADOS_ACTIVOS, type Severidad } from "../domain";
import { alertaParaAgrupar, masGrave, SENALES, senalDe } from "../domain/senales";
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
async function instalacionDe(ctx: Contexto, p: z.infer<typeof payloadSchema>) {
  if (p.instalacionId) return p.instalacionId;
  if (!p.personaId) return null;
  const v = await ctx.db.vinculoLaboral.findFirst({
    where: { personaId: p.personaId, estado: "vigente", instalacionId: { not: null } },
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
    const instalacionId = await instalacionDe(ctx, p.data);
    if (!instalacionId) return;
    const persona = p.data.personaId
      ? await ctx.db.persona.findFirst({ where: { id: p.data.personaId }, select: { id: true } })
      : null;
    const personaId = persona?.id ?? null;
    await ctx.transaccion(async (tx) => {
      if (await tx.centralAlertaEvento.findFirst({ where: { tipo: "senal", nota: { startsWith: `${ev.id} ` } } })) return;
      const abiertas = await tx.centralAlerta.findMany({
        where: { instalacionId, personaId, estado: { in: [...ESTADOS_ACTIVOS, "pospuesta"] } },
      });
      const destino = alertaParaAgrupar(abiertas, { instalacionId, personaId, evento: senal.evento }, new Date());
      const nota = `${ev.id} ${senal.nombre}`;
      if (destino) {
        const nueva = masGrave(destino.severidad as Severidad, severidad);
        // Una pospuesta vuelve a la cola apenas llega una señal nueva (R4a).
        const estado = (destino.estado === "pospuesta" ? (destino.estadoPrevio ?? "nueva") : destino.estado) as (typeof ESTADOS_ACTIVOS)[number];
        await tx.centralAlerta.update({
          where: { id: destino.id },
          data: { severidad: nueva, estado, estadoPrevio: null, pospuestaHasta: null },
        });
        if (destino.estado === "pospuesta")
          await registrarHecho(ctx, tx, { alertaId: destino.id, tipo: "reactivada", estadoDesde: "pospuesta", estadoHacia: estado, sistema: true });
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
