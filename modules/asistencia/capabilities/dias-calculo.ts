import type { Contexto } from "@opai/capabilities";
import { diaEnZona, instanteEnZona } from "@opai/domain";

import { consolidarDia, esTipoJornada, type DiaConsolidado, type MarcaEfectiva, type TipoJornada, type TipoMarca } from "../domain";
import { correccionesVista } from "./correcciones-listar";
import { tenantBasico } from "./formato";

const H = 3_600_000;

export type DiaCalculado = DiaConsolidado & {
  personaId: string;
  fecha: string;
  tipoJornada: TipoJornada;
  instalacionId: string | null;
  turnoEsperadoId: string | null;
  turno: { inicio: Date; fin: Date } | null;
  correccionPendiente: boolean;
};

/** Límites UTC del día calendario de la empresa: [00:00, 00:00 del siguiente). */
export function limitesDelDia(fecha: string, zona: string): { desde: Date; hasta: Date } {
  const siguiente = new Date(Date.parse(`${fecha}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  return { desde: new Date(instanteEnZona(fecha, "00:00", zona)), hasta: new Date(instanteEnZona(siguiente, "00:00", zona)) };
}

/**
 * Calcula (sin guardar) el día de una persona con las marcas EFECTIVAS: una corrección aceptada o vencida cuenta
 * con su valor propuesto; pendiente u objetada, con el original (L-24 y L-27). Un día puede tener varios turnos:
 * se toma el span entre el primero y el último.
 */
export async function calcularDia(ctx: Contexto, personaId: string, fecha: string, ahora = new Date(), zonaDada?: string, instalaciones?: readonly string[]): Promise<DiaCalculado> {
  const zona = zonaDada ?? (await tenantBasico(ctx)).zona;
  const { desde, hasta } = limitesDelDia(fecha, zona);
  const fechaDia = new Date(`${fecha}T00:00:00Z`);
  const turnos = await ctx.db.turnoEsperado.findMany({ where: { personaId, vigente: true, fecha: new Date(`${fecha}T00:00:00Z`), ...(instalaciones ? { instalacionId: { in: [...instalaciones] } } : {}) }, orderBy: { inicio: "asc" } });
  const turno = turnos.length ? { inicio: turnos[0]!.inicio, fin: turnos.at(-1)!.fin } : null;
  const ventana = turno ? { gte: new Date(turno.inicio.getTime() - 8 * H), lt: new Date(turno.fin.getTime() + 8 * H) } : { gte: desde, lt: hasta };
  // Una contingencia aceptada cuenta en la hora que se declaró, no en la que se aceptó (puede ser días después).
  const efectiva = (m: { origen: string; horaServidor: Date; horaDispositivo: Date | null }) => (m.origen === "contingencia" && m.horaDispositivo ? m.horaDispositivo : m.horaServidor);
  const [marcasBrutas, vinculo, previas] = await Promise.all([
    ctx.db.marca.findMany({
      where: { personaId, OR: [{ origen: { not: "contingencia" }, horaServidor: ventana }, { origen: "contingencia", horaDispositivo: ventana }] },
      orderBy: { horaServidor: "asc" },
    }),
    // El vínculo que cubría esa fecha (no el de hoy): un recálculo histórico no debe tomar un contrato posterior.
    ctx.db.vinculoLaboral.findFirst({
      where: { personaId, inicio: { lte: fechaDia }, OR: [{ termino: null }, { termino: { gte: fechaDia } }] },
      select: { tipoJornada: true }, orderBy: { inicio: "desc" },
    }),
    ctx.db.marca.findMany({ where: { personaId, tipo: "salida", horaServidor: { gte: new Date((turno?.inicio ?? desde).getTime() - 48 * H), lt: ventana.gte } }, orderBy: { horaServidor: "desc" }, take: 1 }),
  ]);
  const marcas = marcasBrutas.sort((a, b) => efectiva(a).getTime() - efectiva(b).getTime());
  const correcciones = marcas.length ? await correccionesVista(ctx, { marcaId: { in: marcas.map((m) => m.id) } }, ahora) : [];
  const porMarca = new Map(correcciones.map((c) => [c.marcaId, c]));
  const efectivas: MarcaEfectiva[] = marcas.map((m) => {
    const c = porMarca.get(m.id);
    return c?.rige === "propuesta" ? { tipo: c.propuesta.tipo as TipoMarca, hora: new Date(c.propuesta.hora) } : { tipo: m.tipo as TipoMarca, hora: efectiva(m) };
  });
  const tipoJornada = esTipoJornada(vinculo?.tipoJornada) ? vinculo.tipoJornada : "ordinaria";
  const dia = consolidarDia({
    turno, marcas: efectivas, tipoJornada, ahora,
    colacion: { jornadaPactadaMin: null, puestoMin: turnos[0]?.colacionMin ?? null },
    salidaPrevia: previas[0]?.horaServidor ?? null,
  });
  return {
    ...dia, personaId, fecha, tipoJornada, turno,
    instalacionId: turnos[0]?.instalacionId ?? marcas[0]?.instalacionId ?? null,
    turnoEsperadoId: turnos[0]?.id ?? null,
    correccionPendiente: correcciones.some((c) => c.estado === "pendiente"),
  };
}

/** Calcula y guarda (upsert) el día consolidado. Idempotente: recalcular da el mismo resultado. */
export async function consolidarYGuardar(ctx: Contexto, personaId: string, fecha: string, ahora = new Date(), zona?: string) {
  const d = await calcularDia(ctx, personaId, fecha, ahora, zona);
  const datos = {
    turnoEsperadoId: d.turnoEsperadoId, instalacionId: d.instalacionId, tipoJornada: d.tipoJornada, estado: d.estado, sigla: d.sigla,
    minutosTrabajados: d.minutosTrabajados, segundosAtraso: d.segundosAtraso, segundosExtra: d.segundosExtra,
    segundosSalidaAnticipada: d.segundosSalidaAnticipada, descansoInsuficiente: d.descansoInsuficiente,
    correccionPendiente: d.correccionPendiente, entrada: d.entrada, salida: d.salida, calculadoEn: ahora,
  };
  await ctx.db.dia.upsert({
    where: { tenantId_personaId_fecha: { tenantId: ctx.tenantId, personaId, fecha: new Date(`${fecha}T00:00:00Z`) } },
    create: { tenantId: ctx.tenantId, personaId, fecha: new Date(`${fecha}T00:00:00Z`), ...datos },
    update: datos,
  });
  return d;
}

/** Fecha (en la zona de la empresa) a la que pertenece un instante. */
export const fechaDe = (instante: Date, zona: string): string => diaEnZona(instante, zona);
