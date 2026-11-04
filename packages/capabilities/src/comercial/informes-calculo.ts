// Cálculo puro de los informes de Comercial para agentes (BRIEF bot operativo). Sin base de datos:
// recibe filas ya leídas y devuelve agregados, para probarlo sin contexto.

/** Monto mensual de un negocio: el valor de la cotización vigente o, si no hay, el estimado. */
export function montoMensual(n: {
  valorMensual: number | null;
  montoEstimadoMensual: number | null;
}): number {
  return n.valorMensual ?? n.montoEstimadoMensual ?? 0;
}

/** Porcentaje entero (0–100); 0 si no hay total. No es dinero: se redondea al entero. */
export function porcentaje(parte: number, total: number): number {
  return total > 0 ? Math.round((parte * 100) / total) : 0;
}

export type Alerta = "sin_monto" | "sin_fecha_cierre" | "cierre_vencido" | "sin_actividad";

export type NegocioParaAlerta = {
  /** La etapa exige monto o fecha de cierre (etapa avanzada del embudo). */
  etapaExigeMonto: boolean;
  etapaExigeCierre: boolean;
  monto: number;
  cierreEstimado: string | null;
  /** Fecha civil (aaaa-mm-dd) del último contacto, o null si no hay actividad visible. */
  ultimaActividad: string | null;
  creadoEn: string;
};

const MS_DIA = 86_400_000;
const medianoche = (d: string) => Date.parse(`${d.slice(0, 10)}T00:00:00Z`);

/** Días civiles entre dos fechas aaaa-mm-dd (hasta − desde). */
export const diasEntre = (desde: string, hasta: string) =>
  Math.floor((medianoche(hasta) - medianoche(desde)) / MS_DIA);

/**
 * Alertas de un negocio abierto. `actividadVisible` indica si el actor puede leer actividades:
 * sin ese permiso no se evalúa la inactividad (no se afirma lo que no se puede comprobar).
 */
export function alertasDe(
  n: NegocioParaAlerta,
  hoy: string,
  diasSinActividad: number,
  actividadVisible: boolean,
): { alertas: Alerta[]; diasSinActividad: number | null } {
  const alertas: Alerta[] = [];
  if (n.etapaExigeMonto && n.monto <= 0) alertas.push("sin_monto");
  if (n.etapaExigeCierre && !n.cierreEstimado) alertas.push("sin_fecha_cierre");
  if (n.cierreEstimado && n.cierreEstimado < hoy) alertas.push("cierre_vencido");
  const inactivo = actividadVisible ? diasEntre(n.ultimaActividad ?? n.creadoEn, hoy) : null;
  if (inactivo !== null && inactivo >= diasSinActividad) alertas.push("sin_actividad");
  return { alertas, diasSinActividad: inactivo };
}
