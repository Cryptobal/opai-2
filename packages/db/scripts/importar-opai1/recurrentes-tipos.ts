import type { Decision } from "./comun";

export type DatosProgramacion = {
  cuentaId: string;
  instalacionId: string | null;
  nombre: string;
  activa: boolean;
  tipoDte: 33 | 34;
  diaGeneracion: number;
  moneda: string;
  plazoPagoDias: number;
  facturaTiming: string;
  facturaDia: number | null;
  facturaMesRelativo: string;
  diasFacturacion: number | null;
  modoPeriodoFacturado: string;
  politicaTextoPeriodo: string;
  montoVariable: boolean;
  autoEnvioProforma: boolean;
  autoEnvioEstadoPago: boolean;
  notas: string | null;
  referenciasAdicionales: unknown;
  proximaEjecucionEn: string | null;
  ultimaEjecucionEn: string | null;
  lineas: { glosa: string; monto: number }[];
  destinatariosContactoOpai1Ids: string[];
};

export type ResumenDestinatarios = {
  entrantes: number;
  asignados: number;
  omitidos: number;
  omitidosPorMotivo: Record<string, number>;
};

export type PlanRecurrentes = {
  decisiones: Decision<DatosProgramacion>[];
  destinatarios: ResumenDestinatarios;
};
