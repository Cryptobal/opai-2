import { sumarDiasHabiles, type AmbitoHabil } from "../calendario/habiles";
import { formatearFecha } from "../formato";

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

/** Propuesta de finiquito (diseño 08): montos orientativos, sin contador de vacaciones ni carta art. 162. */
export function propuestaFiniquito(
  datos: {
    vinculoId: string;
    personaId: string;
    inicio: string;
    termino: string;
    motivoTermino: string | null;
    sueldoBase: number | null;
    diasTrabajadosMes: number | null;
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

  const lineas: LineaFiniquito[] = [];
  if (anios > 0 && sueldo > 0) {
    lineas.push({
      id: "indemnizacion_anios",
      concepto: `Indemnización por años de servicio · ${anios} año${anios === 1 ? "" : "s"}`,
      origen: "Estimación Art. 163 · por verificar",
      monto: Math.round(sueldo * anios),
    });
  }
  if (sueldo > 0) {
    lineas.push({
      id: "indemnizacion_aviso",
      concepto: "Indemnización sustitutiva del aviso previo",
      origen: datos.motivoTermino ? `Causal: ${datos.motivoTermino}` : "Art. 161 · por verificar",
      monto: sueldo,
    });
  }
  avisos.push("Feriado proporcional pendiente del contador de vacaciones (ADR-056).");
  if (datos.diasTrabajadosMes != null && datos.diasTrabajadosMes > 0 && sueldo > 0) {
    lineas.push({
      id: "dias_trabajados",
      concepto: `Remuneración días trabajados · ${datos.diasTrabajadosMes} días`,
      origen: `Proporción mes de término (${formatearFecha(datos.termino)})`,
      monto: Math.round((sueldo * datos.diasTrabajadosMes) / 30),
    });
  }

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