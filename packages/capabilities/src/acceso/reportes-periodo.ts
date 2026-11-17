import { diaEnZona, instanteEnZona, type FrecuenciaReporte } from "@opai/domain";

const DIA_MS = 86_400_000;

function diaAnterior(dia: string): string {
  return diaEnZona(new Date(Date.parse(`${dia}T12:00:00Z`) - DIA_MS));
}

function diaMenos(dia: string, n: number): string {
  return diaEnZona(new Date(Date.parse(`${dia}T12:00:00Z`) - n * DIA_MS));
}

function etiquetaDia(dia: string): string {
  const [y, m, d] = dia.split("-");
  return `${d}-${m}-${y}`;
}

/** Día de la semana 1=lunes … 7=domingo, en la zona del tenant. */
export function diaSemana(dia: string): number {
  const t = new Date(`${dia}T12:00:00Z`).getUTCDay();
  return t === 0 ? 7 : t;
}

function primerDiaMes(dia: string): string {
  const [y, m] = dia.split("-");
  return `${y}-${m}-01`;
}

function mesAnterior(primerDia: string): string {
  const t = Date.parse(`${primerDia}T12:00:00Z`);
  const prev = new Date(t);
  prev.setUTCMonth(prev.getUTCMonth() - 1);
  return diaEnZona(prev);
}

export type VentanaReporte = { desde: Date; hasta: Date; periodo: string };

/** Período que toca enviar hoy, o `null` si la frecuencia no corre o ya se envió. */
export function ventanaReporte(
  frecuencia: FrecuenciaReporte,
  hoy: string,
  zona: string,
  ultimoHasta: Date | null,
): VentanaReporte | null {
  if (frecuencia === "desactivado") return null;
  if (frecuencia === "diario") {
    const hasta = new Date(instanteEnZona(hoy, "00:00", zona));
    const ayer = diaAnterior(hoy);
    const desde = new Date(instanteEnZona(ayer, "00:00", zona));
    if (ultimoHasta && ultimoHasta >= hasta) return null;
    return { desde, hasta, periodo: etiquetaDia(ayer) };
  }
  if (frecuencia === "semanal") {
    if (diaSemana(hoy) !== 1) return null;
    const hasta = new Date(instanteEnZona(hoy, "00:00", zona));
    const desdeDia = diaMenos(hoy, 7);
    const desde = new Date(instanteEnZona(desdeDia, "00:00", zona));
    if (ultimoHasta && ultimoHasta >= hasta) return null;
    return {
      desde,
      hasta,
      periodo: `${etiquetaDia(desdeDia)} al ${etiquetaDia(diaAnterior(hoy))}`,
    };
  }
  if (frecuencia === "mensual") {
    if (!hoy.endsWith("-01")) return null;
    const hasta = new Date(instanteEnZona(hoy, "00:00", zona));
    const desdeDia = mesAnterior(primerDiaMes(hoy));
    const desde = new Date(instanteEnZona(desdeDia, "00:00", zona));
    if (ultimoHasta && ultimoHasta >= hasta) return null;
    return { desde, hasta, periodo: `Mes ${desdeDia.slice(5, 7)}-${desdeDia.slice(0, 4)}` };
  }
  return null;
}