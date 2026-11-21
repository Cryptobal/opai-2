import { sumarDiasHabiles, type AmbitoHabil } from "../calendario/habiles";
import { lineasPropuestaFiniquito } from "./finiquito-lineas";

export type LineaFiniquito = {
  id: string;
  concepto: string;
  origen: string;
  monto: number;
};

export type PropuestaFiniquito = {
  vinculoId: string;
  personaId: string;
  terminoEn: string;
  sueldoReferencia: number;
  aniosServicio: number;
  plazoPagoHasta: string;
  diasHabilesRestantesPago: number | null;
  lineas: LineaFiniquito[];
  total: number;
  avisos: string[];
};

const mesesEntre = (desde: string, hasta: string) => {
  const a = Date.parse(`${desde}T00:00:00.000Z`);
  const b = Date.parse(`${hasta}T00:00:00.000Z`);
  if (b < a) return 0;
  return Math.max(0, Math.round((b - a) / (86_400_000 * 30.4375)));
};

const diasHabilesRestantes = (plazoHasta: string, hoy: string) => {
  const fin = Date.parse(`${plazoHasta}T00:00:00.000Z`);
  const h = Date.parse(`${hoy}T00:00:00.000Z`);
  return fin >= h ? Math.round((fin - h) / 86_400_000) : null;
};

/** Propuesta de finiquito (diseño 08): montos orientativos; feriado estimado sin contador oficial (ADR-056). */
export function propuestaFiniquito(
  datos: {
    vinculoId: string;
    personaId: string;
    inicio: string;
    termino: string;
    motivoTermino: string | null;
    sueldoBase: number | null;
    diasTrabajadosMes: number | null;
    /** Días calendario de vacaciones ya tomados (ausencias aprobadas), si se conocen. */
    diasVacacionesTomados?: number;
  },
  hoy: string,
  feriados: AmbitoHabil = new Set(),
): PropuestaFiniquito {
  const avisos = ["Los montos son orientativos y requieren validación legal antes del pago."];
  const sueldo = datos.sueldoBase ?? 0;
  if (!datos.sueldoBase) avisos.push("Sin sueldo base en la capa vigente al término.");
  const meses = mesesEntre(datos.inicio, datos.termino);
  const anios = Math.floor(meses / 12);
  const plazoPagoHasta = sumarDiasHabiles(datos.termino, 5, feriados);
  const diasHabilesRestantesPago = diasHabilesRestantes(plazoPagoHasta, hoy);

  const lineas = lineasPropuestaFiniquito(datos, meses, sueldo);

  return {
    vinculoId: datos.vinculoId,
    personaId: datos.personaId,
    terminoEn: datos.termino,
    sueldoReferencia: sueldo,
    aniosServicio: anios,
    plazoPagoHasta,
    diasHabilesRestantesPago,
    lineas,
    total: lineas.reduce((s, l) => s + l.monto, 0),
    avisos,
  };
}