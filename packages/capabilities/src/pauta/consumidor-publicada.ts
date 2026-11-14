import { z } from "zod";

import { avisarAlCelular } from "../core/push-avisar";
import { defineConsumidor } from "../eventos/consumidores";

const payloadSchema = z.object({
  instalacionId: z.string(),
  mes: z.string(),
  personas: z.array(z.object({ personaId: z.string(), dias: z.array(z.string()) })),
});

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** «diciembre de 2026» desde «2026-12». */
export function nombreMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number) as [number, number];
  return `${MESES[m - 1] ?? mes} de ${a}`;
}

/** «1, 2, 5 y 6» desde los días aaaa-mm-dd. */
export function listaDias(dias: readonly string[]): string {
  const n = dias.map((d) => String(Number(d.slice(8))));
  return n.length <= 1 ? (n[0] ?? "") : `${n.slice(0, -1).join(", ")} y ${n.at(-1)}`;
}

/**
 * Aviso en la campana del portal a cada titular con usuario cuando se publica la pauta (CAR-356). Idempotente por
 * evento y usuario (el despacho reintenta). Sin WhatsApp (decisión de Carlos del 13-nov-2026). Además toca el celular
 * de quien activó los avisos en su dispositivo (sin contenido, PR 4a).
 */
export const consumidorPautaPublicada = defineConsumidor({
  id: "pauta.publicada.avisar",
  descripcion:
    "Avisa en su portal a cada guardia titular sus turnos cuando se publica la pauta del mes.",
  eventos: ["pauta.publicada"],
  async handler(ctx, ev) {
    const p = payloadSchema.safeParse(ev.payload);
    if (!p.success || p.data.personas.length === 0) return;
    const { instalacionId, mes, personas } = p.data;
    const inst = await ctx.db.instalacion.findFirst({
      where: { id: instalacionId },
      select: { nombre: true },
    });
    const conUsuario = await ctx.db.persona.findMany({
      where: { id: { in: personas.map((x) => x.personaId) }, usuarioId: { not: null } },
      select: { id: true, usuarioId: true },
    });
    const avisados: string[] = [];
    for (const persona of conUsuario) {
      const usuarioId = persona.usuarioId;
      const dias = personas.find((x) => x.personaId === persona.id)?.dias ?? [];
      if (!usuarioId || dias.length === 0) continue;
      if (await ctx.db.notificacion.findFirst({ where: { eventoId: ev.id, usuarioId } })) continue;
      await ctx.db.notificacion.create({
        data: {
          tenantId: ctx.tenantId,
          usuarioId,
          eventoId: ev.id,
          titulo: `Tu pauta de ${nombreMes(mes)} está publicada`,
          cuerpo: `${inst?.nombre ?? "Tu instalación"}: ${dias.length} ${dias.length === 1 ? "turno" : "turnos"}, los días ${listaDias(dias)}.`,
          enlace: "/trabajador",
        },
      });
      avisados.push(usuarioId);
    }
    // Celular (PR 4a): solo a quien recibió el aviso ahora; un reintento del despacho no vuelve a tocar.
    await avisarAlCelular(ctx, avisados, "pauta", "pauta");
  },
});
