import {
  detectarDoblaje,
  sumarDias,
  turnosDeSerie,
  type PatronPauta,
} from "@opai/domain";

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
};

/**
 * Prohibido doblar (A9): la persona no puede quedar con dos turnos solapados o seguidos entre sus
 * series vigentes en otros puestos. Compara la serie candidata con las demás de la persona durante
 * una ventana que cubre todas las fases de los ciclos; los días de excepción de esas series no
 * cuentan como turno. Lanza una regla de negocio explicada si hay cruce.
 */
export async function validarNoDoblar(ctx: Contexto, c: Candidata): Promise<void> {
  const fin = sumarDias(c.desde, VENTANA_DIAS - 1);
  const otras = await ctx.db.seriePauta.findMany({
    where: {
      titularPersonaId: c.titularPersonaId,
      puestoId: { not: c.puestoId },
      vigenteDesde: { lte: aFechaDb(fin) },
      OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: aFechaDb(c.desde) } }],
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
        fecha: { gte: aFechaDb(c.desde), lte: aFechaDb(fin) },
      },
      select: { puestoId: true, fecha: true },
    }),
  ]);
  const propios = turnosDeSerie(
    { etiqueta: "esta serie", patron: c.patron, inicioCiclo: c.inicioCiclo, horaInicio: c.horaInicio, horaFin: c.horaFin },
    c.desde,
    fin,
  );
  for (const s of otras) {
    const puesto = puestos.find((p) => p.id === s.puestoId);
    const patron = patrones.find((p) => p.id === s.patronId);
    if (!puesto || !patron) continue;
    const desde = fechaIso(s.vigenteDesde) > c.desde ? fechaIso(s.vigenteDesde) : c.desde;
    const hasta = s.vigenteHasta && fechaIso(s.vigenteHasta) < fin ? fechaIso(s.vigenteHasta) : fin;
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
        `No se puede doblar: esa persona ya cubre «${cruce.con}» el ${cruce.fecha} y los turnos se solapan o quedan seguidos. Elige otro titular o cambia el inicio de ciclo.`,
      );
  }
}
