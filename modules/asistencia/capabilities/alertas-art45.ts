import { z } from "zod";

import { ajuste, defineTrabajo, type Contexto } from "@opai/capabilities";

import {
  debeAlertarInicio, debeAlertarTermino, sobretiempoSegundos, textoDuracion, tocaAvisoCompensables,
} from "../domain";
import { fechaHora, tenantBasico } from "./formato";

const H = 3_600_000;
type Tipo = "sin_marca_inicio" | "sin_marca_termino" | "compensables";
const EVENTO: Record<Tipo, string> = {
  sin_marca_inicio: "asistencia.alerta.sin_marca_inicio",
  sin_marca_termino: "asistencia.alerta.sin_marca_termino",
  compensables: "asistencia.aviso.compensables",
};

/** Crea la alerta si no existía (clave única) y, solo entonces, emite el evento que la envía: idempotente. */
async function emitir(
  ctx: Contexto, tipo: Tipo, clave: string, personaId: string,
  refs: { instalacionId?: string; turnoEsperadoId?: string }, datos: Record<string, unknown>,
): Promise<boolean> {
  // La alerta y su evento van en la misma transacción: si falla el evento, la clave única no queda tomada.
  const emitido = await ctx.transaccion(async (tx) => {
    const r = await tx.alerta.createMany({
      data: [{ tenantId: ctx.tenantId, tipo, clave, personaId, datos: datos as never, ...refs }], skipDuplicates: true,
    });
    if (r.count === 0) return false;
    await ctx.eventos.emitir(tx, { tipo: EVENTO[tipo], entidadTipo: "persona", entidadId: personaId, payload: { personaId, tipo, clave, ...datos } });
    return true;
  });
  if (!emitido) return false;
  return true;
}

/**
 * Alertas del art. 45 (L-31, L-32): falta de marca de inicio a los N minutos (30 por defecto) y falta de marca
 * de término (el empleador puede apagarla). Cada alerta tiene clave única por turno, así que correr el
 * trabajo dos veces no repite avisos. El reloj se inyecta (`ahora`) para probarlo con reloj simulado.
 */
export const trabajoAlertasArt45 = defineTrabajo({
  tipo: "asistencia.alertas.art45",
  descripcion: "Alerta la falta de marca de inicio y de término de los turnos (art. 45 de la Res. 38).",
  payload: z.object({ ahora: z.string().datetime().optional() }),
  periodicidad: "horaria",
  async handler(ctx, p) {
    const ahora = p.ahora ? new Date(p.ahora) : new Date();
    const [minutos, terminoActiva, t] = await Promise.all([
      ajuste<number>(ctx, "asistencia", "alerta_inicio_minutos"),
      ajuste<boolean>(ctx, "asistencia", "alerta_termino_activa"),
      tenantBasico(ctx),
    ]);
    const turnos = await ctx.db.turnoEsperado.findMany({
      where: { vigente: true, inicio: { lte: ahora }, fin: { gte: new Date(ahora.getTime() - 24 * H) } },
    });
    if (!turnos.length) return { inicio: 0, termino: 0 };
    const marcas = await ctx.db.marca.findMany({
      where: { personaId: { in: [...new Set(turnos.map((x) => x.personaId))] }, horaServidor: { gte: new Date(ahora.getTime() - 50 * H) } },
      select: { personaId: true, tipo: true, horaServidor: true },
    });
    let inicio = 0, termino = 0;
    for (const x of turnos) {
      const suyas = marcas.filter((m) => m.personaId === x.personaId);
      const desde = x.inicio.getTime() - 2 * H;
      const entrada = suyas.find((m) => m.tipo === "entrada" && m.horaServidor.getTime() >= desde);
      const salida = suyas.find((m) => m.tipo === "salida" && entrada && m.horaServidor >= entrada.horaServidor);
      const lugar = (await ctx.db.instalacion.findUnique({ where: { id: x.instalacionId }, select: { nombre: true } }))?.nombre ?? "";
      const refs = { instalacionId: x.instalacionId, turnoEsperadoId: x.id };
      if (debeAlertarInicio(x, Boolean(entrada), ahora, minutos))
        inicio += (await emitir(ctx, "sin_marca_inicio", `turno:${x.id}`, x.personaId, refs,
          { turno: { inicio: fechaHora(x.inicio, t.zona), lugar } })) ? 1 : 0;
      if (debeAlertarTermino(x, Boolean(entrada), Boolean(salida), ahora, terminoActiva))
        termino += (await emitir(ctx, "sin_marca_termino", `turno:${x.id}`, x.personaId, refs,
          { turno: { fin: fechaHora(x.fin, t.zona), lugar } })) ? 1 : 0;
    }
    return { inicio, termino };
  },
});

/**
 * Cada 30 días, aviso de horas compensables (sobretiempo al segundo) acumuladas (L-33). Los días de descanso
 * acumulados y el aviso de desconexión del teletrabajo (L-34) llegan con los tipos de jornada.
 */
export const trabajoAvisoCompensables = defineTrabajo({
  tipo: "asistencia.alertas.compensables",
  descripcion: "Avisa cada 30 días las horas compensables acumuladas de cada trabajador.",
  payload: z.object({ ahora: z.string().datetime().optional() }),
  periodicidad: "diaria",
  async handler(ctx, p) {
    const ahora = p.ahora ? new Date(p.ahora) : new Date();
    const t = await tenantBasico(ctx);
    const desde = new Date(ahora.getTime() - 30 * 24 * H);
    const personas = await ctx.db.marca.findMany({ distinct: ["personaId"], select: { personaId: true }, take: 2000 });
    let avisos = 0;
    for (const { personaId } of personas) {
      const primera = await ctx.db.marca.findFirst({ where: { personaId }, orderBy: { horaServidor: "asc" }, select: { horaServidor: true } });
      const ultimo = await ctx.db.alerta.findFirst({ where: { personaId, tipo: "compensables" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
      if (!tocaAvisoCompensables(ultimo?.createdAt ?? null, primera?.horaServidor ?? null, ahora)) continue;
      const salidas = await ctx.db.marca.findMany({
        where: { personaId, tipo: "salida", horaServidor: { gte: desde, lte: ahora }, turnoFin: { not: null } },
        select: { horaServidor: true, turnoFin: true },
      });
      const seg = salidas.reduce((s, m) => s + sobretiempoSegundos(m.turnoFin!, m.horaServidor), 0);
      avisos += (await emitir(ctx, "compensables", `persona:${personaId}:${ahora.toISOString().slice(0, 10)}`, personaId, {},
        { periodo: { desde: fechaHora(desde, t.zona), hasta: fechaHora(ahora, t.zona) }, horas: { compensables: textoDuracion(seg) } })) ? 1 : 0;
    }
    return { avisos };
  },
});
