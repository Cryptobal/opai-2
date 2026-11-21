import { reglaDeNegocio, type Contexto } from "@opai/capabilities";

import { alcanceMarcas } from "./alcance-marcas";

const dia = (f: string) => new Date(`${f}T00:00:00Z`);
const MAX_FILAS = 20_000;

type ItemResumenAsistencia = {
  personaId: string;
  dias: number;
  presentes: number;
  ausentes: number;
  sinMarca: number;
  incompletos: number;
  minutosTrabajados: number;
  segundosAtraso: number;
  segundosExtra: number;
  diasDescansoInsuficiente: number;
  provisorio: boolean;
  siglas: Record<string, number>;
};

export type ResumenAsistenciaPersona = Pick<
  ItemResumenAsistencia,
  "personaId" | "presentes" | "ausentes" | "segundosAtraso" | "segundosExtra" | "provisorio"
>;

/** Filas consolidadas por persona en el rango (fuente de Nómina y de `asistencia.dias.resumen_periodo`). */
async function itemsResumenAsistenciaPeriodo(
  ctx: Contexto,
  desde: string,
  hasta: string,
  instalacionId?: string,
): Promise<ItemResumenAsistencia[]> {
  const alcance = await alcanceMarcas(ctx);
  const filas = await ctx.db.dia.findMany({
    where: {
      fecha: { gte: dia(desde), lte: dia(hasta) },
      AND: [alcance, instalacionId ? { instalacionId } : {}],
    },
    take: MAX_FILAS + 1,
  });
  if (filas.length > MAX_FILAS) throw reglaDeNegocio("El período es demasiado grande: acótalo por instalación o por fechas.");
  const por = new Map<string, ItemResumenAsistencia>();
  for (const d of filas) {
    const r = por.get(d.personaId) ?? {
      personaId: d.personaId,
      dias: 0,
      presentes: 0,
      ausentes: 0,
      sinMarca: 0,
      incompletos: 0,
      minutosTrabajados: 0,
      segundosAtraso: 0,
      segundosExtra: 0,
      diasDescansoInsuficiente: 0,
      provisorio: false,
      siglas: {},
    };
    r.dias += 1;
    if (d.estado === "presente") r.presentes += 1;
    if (d.estado === "ausente") r.ausentes += 1;
    if (d.estado === "sin_marca") r.sinMarca += 1;
    if (d.estado === "incompleto") r.incompletos += 1;
    r.minutosTrabajados += d.minutosTrabajados;
    r.segundosAtraso += d.segundosAtraso;
    r.segundosExtra += d.segundosExtra;
    if (d.descansoInsuficiente) r.diasDescansoInsuficiente += 1;
    if (d.correccionPendiente) r.provisorio = true;
    if (d.sigla) r.siglas[d.sigla] = (r.siglas[d.sigla] ?? 0) + 1;
    por.set(d.personaId, r);
  }
  return [...por.values()];
}

/** Mapa liviano por persona para el cálculo de liquidaciones. */
export async function resumenAsistenciaPeriodo(
  ctx: Contexto,
  desde: string,
  hasta: string,
): Promise<Map<string, ResumenAsistenciaPersona>> {
  const items = await itemsResumenAsistenciaPeriodo(ctx, desde, hasta);
  return new Map(
    items.map((r) => [
      r.personaId,
      {
        personaId: r.personaId,
        presentes: r.presentes,
        ausentes: r.ausentes,
        segundosAtraso: r.segundosAtraso,
        segundosExtra: r.segundosExtra,
        provisorio: r.provisorio,
      },
    ]),
  );
}