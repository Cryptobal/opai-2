// Tipos de lo que devuelven las capacidades de Pauta (las pantallas no importan los esquemas Zod).
export type Motivo = "sin_titular" | "ausencia" | "licencia" | "vacaciones" | "permiso";
export type EstadoCelda = "cubierto" | "libre" | "ppc" | "sin_serie";

export type CeldaDia = {
  fecha: string;
  estado: EstadoCelda;
  motivo: Motivo | null;
  excepcion: boolean;
  feriado: string | null;
  titularId: string | null;
};

export type ResumenCobertura = {
  programados: number;
  cubiertos: number;
  ppc: number;
  cobertura: number | null;
  ppcPorMotivo: Record<string, number>;
};

export type SerieVista = {
  id: string;
  patronId: string;
  patron: string;
  inicioCiclo: string;
  titularId: string | null;
  titular: string | null;
  desde: string;
  hasta: string | null;
};

export type PuestoMes = {
  id: string;
  nombre: string;
  funcion: string | null;
  horario: string;
  jornada: string;
  serie: SerieVista | null;
  celdas: CeldaDia[];
  resumen: ResumenCobertura;
};

export type MesPauta = {
  instalacionId: string;
  instalacion: string;
  anio: number;
  mes: number;
  hoy: string;
  feriados: { fecha: string; nombre: string }[];
  personas: { id: string; nombre: string }[];
  puestos: PuestoMes[];
  resumen: ResumenCobertura;
  patrones: { id: string; nombre: string; ciclo: string }[];
  candidatos: { id: string; nombre: string }[];
};

export type FilaInstalacion = {
  instalacionId: string;
  instalacion: string;
  cuenta: string;
  puestos: number;
  resumen: ResumenCobertura;
};

export type ResumenTodas = {
  anio: number;
  mes: number;
  instalaciones: FilaInstalacion[];
  resumen: ResumenCobertura;
};

export type Ppc = {
  instalacionId: string;
  instalacion: string;
  puestoId: string;
  puesto: string;
  motivo: Motivo;
  desde: string;
  hasta: string;
  dias: number;
};

export type LineaHistorial = {
  id: string;
  accion: "serie_fijada" | "excepcion_creada" | "excepcion_anulada";
  puestoId: string;
  puesto: string;
  instalacionId: string;
  actorTipo: string;
  actorNombre: string | null;
  desde: string;
  hasta: string;
  detalle: Record<string, string | number | null>;
  creadoEn: string;
};

export type OpcionInstalacion = { id: string; nombre: string };
