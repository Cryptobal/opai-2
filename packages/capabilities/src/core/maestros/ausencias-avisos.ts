// Avisos de las solicitudes de permiso y vacaciones del portal (CAR-508): a la jefatura cuando llega una y a la persona
// cuando se la responden. Campana siempre; celular solo a quien lo activó (ADR-020). Idempotentes por evento y usuario.
import { z } from "zod";

import { formatearFecha } from "@opai/domain";

import { defineConsumidor, type EventoPublicado } from "../../eventos/consumidores";
import { fechaIso } from "../../pauta/comun";
import type { Contexto } from "../../types";
import { avisarAlCelular } from "../push-avisar";
import { directasPorJefatura } from "../jefatura/empresa";

// «pidió un permiso» / «te aprobaron el permiso»; el portal solo pide permiso o vacaciones (CAR-464).
const UN: Record<string, string> = { permiso: "un permiso", vacaciones: "vacaciones" };
const EL: Record<string, string> = { permiso: "el permiso", vacaciones: "las vacaciones" };

/** Crea el aviso en la campana de cada usuario que aún no lo tiene; devuelve a quiénes se les creó. */
async function avisar(
  ctx: Contexto,
  ev: EventoPublicado,
  usuarios: readonly string[],
  aviso: { titulo: string; cuerpo: string; enlace: string },
) {
  const avisados: string[] = [];
  for (const usuarioId of new Set(usuarios)) {
    if (await ctx.db.notificacion.findFirst({ where: { eventoId: ev.id, usuarioId } })) continue;
    await ctx.db.notificacion.create({
      data: { tenantId: ctx.tenantId, usuarioId, eventoId: ev.id, ...aviso },
    });
    avisados.push(usuarioId);
  }
  return avisados;
}

/** Fechas y tipo de la solicitud, para el texto del aviso (sin el motivo, que puede ser sensible). */
async function datosDe(ctx: Contexto, ausenciaId: string) {
  const a = await ctx.db.ausencia.findFirst({
    where: { id: ausenciaId },
    select: { personaId: true, tipo: true, desde: true, hasta: true },
  });
  if (!a) return null;
  const [desde, hasta] = [fechaIso(a.desde), fechaIso(a.hasta)];
  const fechas =
    desde === hasta
      ? `el ${formatearFecha(desde)}`
      : `del ${formatearFecha(desde)} al ${formatearFecha(hasta)}`;
  return {
    personaId: a.personaId,
    un: UN[a.tipo] ?? "una ausencia",
    el: EL[a.tipo] ?? "la ausencia",
    fechas,
  };
}

export const consumidorAusenciaPedida = defineConsumidor({
  id: "core.ausencias.solicitud_avisar",
  descripcion:
    "Avisa a la jefatura de la persona cuando pide un permiso o vacaciones desde su portal, para que lo responda.",
  eventos: ["portal_trabajador.solicitud.creada"],
  async handler(ctx, ev) {
    const d = ev.entidadId ? await datosDe(ctx, ev.entidadId) : null;
    if (!d) return;
    const jefes = [...(await directasPorJefatura(ctx))].flatMap(([jefe, ids]) =>
      ids.has(d.personaId) ? [jefe] : [],
    );
    const filas = await ctx.db.persona.findMany({
      where: { id: { in: [d.personaId, ...jefes] } },
      select: { id: true, nombres: true, apellidos: true, usuarioId: true },
    });
    const quien = filas.find((p) => p.id === d.personaId);
    const usuarios = filas.flatMap((p) =>
      p.id !== d.personaId && p.usuarioId ? [p.usuarioId] : [],
    );
    const avisados = await avisar(ctx, ev, usuarios, {
      titulo: `${quien ? `${quien.nombres} ${quien.apellidos}` : "Una persona"} pidió ${d.un}`,
      cuerpo: `Pide ${d.un} ${d.fechas}. Respóndele desde su ficha.`,
      enlace: `/personas/${d.personaId}/ausencias`,
    });
    await avisarAlCelular(ctx, avisados, "solicitudes", "core");
  },
});

const respondida = z.object({ ausenciaId: z.string(), estado: z.enum(["aprobada", "rechazada"]) });

export const consumidorAusenciaRespondida = defineConsumidor({
  id: "core.ausencias.respuesta_avisar",
  descripcion:
    "Avisa a la persona en su portal cuando su jefatura aprueba o rechaza el permiso o las vacaciones que pidió.",
  eventos: ["core.ausencia.respondida"],
  async handler(ctx, ev) {
    const p = respondida.safeParse(ev.payload);
    const d = p.success ? await datosDe(ctx, p.data.ausenciaId) : null;
    if (!p.success || !d) return;
    const persona = await ctx.db.persona.findFirst({
      where: { id: d.personaId },
      select: { usuarioId: true },
    });
    if (!persona?.usuarioId) return;
    const aprobada = p.data.estado === "aprobada";
    const avisados = await avisar(ctx, ev, [persona.usuarioId], {
      titulo: aprobada ? `Te aprobaron ${d.el}` : `No te aprobaron ${d.el}`,
      cuerpo: aprobada
        ? `Quedó aprobado lo que pediste ${d.fechas}.`
        : `Lo que pediste ${d.fechas} no fue aprobado. Habla con tu jefatura si tienes dudas.`,
      enlace: "/trabajador/solicitudes",
    });
    await avisarAlCelular(ctx, avisados, "solicitudes", "core");
  },
});
