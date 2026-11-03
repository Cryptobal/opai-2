import type { Decision } from "./comun";

export type LineaProgramacion = {
  glosa: string;
  /** Decimal con 4 decimales como texto (NUMERIC(14,4)). */
  cantidad: string;
  unidad: string | null;
  /** CLP entero; exactamente uno de los dos precios, según la moneda. */
  precioUnitarioClp: number | null;
  /** UF escalada por UF_ESCALA. */
  precioUnitarioUf: number | null;
  /** Centésimas de punto porcentual (1550 = 15,50 %). */
  descuentoPct: number;
  exento: boolean;
  /** La cuenta contable de 1.0 no tiene equivalente todavía: solo se cuenta. */
  tieneCuentaContable1_0: boolean;
};

export type ReceptorCongelado = {
  rut: string | null;
  razonSocial: string | null;
  giro: string | null;
  direccion: string | null;
  comuna: string | null;
  ciudad: string | null;
};

export type DestinatarioCorreo = { correo: string; tipo: "para" | "cc" };

export type DatosProgramacion = {
  /** Clave de cuenta (existente o `nueva:<id 1.0>`); nula si 1.0 no tenía cuenta en 2.0. */
  cuentaId: string | null;
  instalacionId: string | null;
  nombre: string;
  activa: boolean;
  tipoDte: number;
  frecuencia: string;
  diaGeneracion: number;
  diaSemana: number | null;
  mesDelAnio: number | null;
  moneda: string;
  plazoPagoDias: number;
  facturaTiming: string;
  facturaDia: number | null;
  facturaMesRelativo: string;
  modoPeriodoFacturado: string;
  politicaTextoPeriodo: string;
  montoVariable: boolean;
  autoEnvioProforma: boolean;
  autoEnvioEstadoPago: boolean;
  envioAutomatico: boolean;
  notas: string | null;
  referenciasAdicionales: unknown;
  /** AAAA-MM-DD. */
  fechaInicio: string | null;
  fechaFin: string | null;
  politicaUf: string | null;
  diaUf: number | null;
  ajusteIpcMeses: number | null;
  ajusteIpcDesde: string | null;
  receptor: ReceptorCongelado;
  ultimoPeriodo10: string | null;
  ultimaEjecucionEn: string | null;
  lineas: LineaProgramacion[];
  destinatariosContactoOpai1Ids: string[];
  destinatariosCorreo: DestinatarioCorreo[];
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
  avisos: { codigo: string; idOpai1: string }[];
};
