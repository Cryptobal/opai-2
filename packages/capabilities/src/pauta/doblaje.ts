import {
  detectarDoblaje,
  sumarDias,
  turnosDeSerie,
  type PatronPauta,
} from "@opai/domain";

import { dondePuesto } from "../core/maestros/alcance";
import { reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { aFechaDb, fechaIso } from "./comun";

/** Ventana (en días) que alcanza para cubrir el cruce de cualquier par de ciclos (mcm ≤ 56). */
const VENTANA_DIAS = 56;

export type Candidata = {
  puestoId: string;
  titularPersonaId: string;
  patron: PatronPauta;
  inicioCiclo: string;
  desde: string;
  horaInicio: string;
  horaFin: string;
  /** Vista previa: series de otros puestos que se cerrarán antes (puesto → último día de vigencia). */
  cierres?: Readonly<Record<string, string>> | undefined;
};

/**
 * Prohibido doblar (A9): la persona no puede quedar con dos turnos solapados o seguidos entre sus
 * series vigentes en otros puestos. Compara la serie candidata con las demás de la persona durante
 * una ventana que cubre todas las fases de los ciclos; los días de excepción de esas series no
 * cuentan como turno. Lanza una regla de negocio explicada si hay cruce.
 */
export async function validarNoDoblar(ctx: Contexto, c: Candidata): Promise<void> {
  const fin = sumarDias(c.desde, VENTANA_DIAS - 1);
  // Un día antes: el turno de noche que empezó ayer termina hoy y puede tocar el primero de la serie.
  const ini = sumarDias(c.desde, -1);
  const otras = await ctx.db.seriePauta.findMany({
    where: {
      titularPersonaId: c.titularPersonaId,
      puestoId: { not: c.puestoId },
      vigenteDesde: { lte: aFechaDb(fin) },
      OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: aFechaDb(ini) } }],
    },
  });
  if (otras.length === 0) return;
  const [puestos, patrones, excepciones] = await Promise.all([
    ctx.db.puesto.findMany({
      where: { id: { in: otras.map((s) => s.puestoId) } },
      select: { id: true, nombre: true, horaInicio: true, horaFin: true },
    }),
    ctx.db.patronTurno.findMany({ where: { id: { in: otras.map((s) => s.patronId) } } }),
    ctx.db.excepcionPauta.findMany({
      where: {
        puestoId: { in: otras.map((s) => s.puestoId) },
        estado: "activa",
        fecha: { gte: aFechaDb(ini), lte: aFechaDb(fin) },
      },
      select: { puestoId: true, fecha: true },
    }),
  ]);
  // El nombre de un puesto fuera del alcance del actor no se revela (ADR-022).
  const visibles = new Set(
    (
      await ctx.db.puesto.findMany({
        where: { id: { in: puestos.map((p) => p.id) }, AND: [dondePuesto(ctx)] },
        select: { id: true },
      })
    ).map((p) => p.id),
  );
  const propios = turnosDeSerie(
    { etiqueta: "esta serie", patron: c.patron, inicioCiclo: c.inicioCiclo, horaInicio: c.horaInicio, horaFin: c.horaFin },
    c.desde,
    fin,
  );
  for (const s of otras) {
    const puesto = puestos.find((p) => p.id === s.puestoId);
    const patron = patrones.find((p) => p.id === s.patronId);
    if (!puesto || !patron) continue;
    const desde = fechaIso(s.vigenteDesde) > ini ? fechaIso(s.vigenteDesde) : ini;
    const cierre = c.cierres?.[s.puestoId];
    const tope = cierre && (!s.vigenteHasta || cierre < fechaIso(s.vigenteHasta)) ? cierre : s.vigenteHasta ? fechaIso(s.vigenteHasta) : null;
    const hasta = tope && tope < fin ? tope : fin;
    const ajenos = turnosDeSerie(
      {
        etiqueta: puesto.nombre,
        patron: {
          clase: patron.clase === "semanal" ? "semanal" : "ciclico",
          diasTrabajo: patron.diasTrabajo,
          diasDescanso: patron.diasDescanso,
          diasSemana: patron.diasSemana,
        },
        inicioCiclo: fechaIso(s.inicioCiclo),
        horaInicio: puesto.horaInicio,
        horaFin: puesto.horaFin,
        ausencias: new Set(
          excepciones.filter((x) => x.puestoId === s.puestoId).map((x) => fechaIso(x.fecha)),
        ),
      },
      desde,
      hasta,
    );
    const cruce = detectarDoblaje(propios, ajenos);
    if (cruce)
      throw reglaDeNegocio(
        visibles.has(puesto.id)
          ? `No se puede doblar: esa persona ya cubre «${cruce.con}» el ${cruce.fecha} y los turnos se solapan o quedan seguidos. Elige otro titular o cambia el inicio de ciclo.`
          : "No se puede doblar: esa persona ya cubre otro puesto con turnos que se solapan o quedan seguidos. Elige otro titular o cambia el inicio de ciclo.",
      );
  }
}
