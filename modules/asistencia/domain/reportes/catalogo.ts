/** Tipos de reporte DT (Res. Ex. N.º 38). Los ids son estables para MCP, rutas y exportación. */
export const TIPOS_REPORTE_DT = [
  "asistencia",
  "jornada_diaria",
  "domingos_festivos",
  "modificaciones_turnos",
  "reporte_diario",
  "incidentes_tecnicos",
] as const;

export type TipoReporteDt = (typeof TIPOS_REPORTE_DT)[number];

export const METADATOS_REPORTE: Record<
  TipoReporteDt,
  { titulo: string; descripcion: string; obligatorio: boolean }
> = {
  asistencia: {
    titulo: "Asistencia",
    descripcion: "Entradas, salidas y colación por día",
    obligatorio: true,
  },
  jornada_diaria: {
    titulo: "Jornada diaria",
    descripcion: "Horas ordinarias y extraordinarias",
    obligatorio: true,
  },
  domingos_festivos: {
    titulo: "Domingos y festivos",
    descripcion: "Días trabajados y descansos",
    obligatorio: true,
  },
  modificaciones_turnos: {
    titulo: "Modificaciones y alteraciones de turnos",
    descripcion: "Correcciones con su original",
    obligatorio: true,
  },
  reporte_diario: {
    titulo: "Reporte diario",
    descripcion: "Marcas del día por instalación",
    obligatorio: true,
  },
  incidentes_tecnicos: {
    titulo: "Incidentes técnicos",
    descripcion: "Inicio, fin y severidad",
    obligatorio: true,
  },
};

/** Segundos a «h:mm:ss» (atrasos y sobretiempo sin redondeo de minutos). */
export function segundosAHHMMSS(s: number): string {
  if (s <= 0) return "0:00:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/** Minutos trabajados a «h:mm». */
export function minutosAHhMm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}