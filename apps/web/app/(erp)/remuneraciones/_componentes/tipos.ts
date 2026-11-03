import type {
  EstadoObligacion,
  EstadoPeriodo,
  ModoAnticipo,
  TipoNovedad,
  TipoObligacion,
} from "@opai/domain";

// Formas de lo que devuelven las capacidades de Nómina (nomina.<entidad>.<verbo>) a la UI.
export type Periodo = {
  id: string;
  anio: number;
  mes: number;
  etiqueta: string;
  estado: EstadoPeriodo;
  inicio: string;
  fin: string;
  cierrePrevisto: string;
  motivoReapertura: string | null;
  novedades: number;
};

export type Novedad = {
  id: string;
  periodoId: string;
  personaId: string;
  personaNombre: string;
  tipo: TipoNovedad;
  origen: string;
  estado: "vigente" | "anulada";
  fechaDesde: string;
  fechaHasta: string | null;
  cantidad: number | null;
  montoClp: number | null;
  nota: string | null;
  motivoAnulacion: string | null;
};

export type Cuota = { id: string; numero: number; anio: number; mes: number; monto: number; estado: string };
export type Prestamo = {
  id: string;
  personaId: string;
  personaNombre: string;
  montoTotal: number;
  cuotas: number;
  estado: "activo" | "pagado" | "cancelado";
  motivo: string | null;
  saldo: number;
  plan: Cuota[];
};

export type ReglaAnticipo = {
  id: string;
  personaId: string;
  personaNombre: string;
  activa: boolean;
  modo: ModoAnticipo;
  valor: number;
  diaMes: number;
};

export type Obligacion = {
  id: string;
  tipo: TipoObligacion;
  anio: number;
  mes: number | null;
  estado: EstadoObligacion;
  fechaLimite: string | null;
  plazoVerificado: boolean;
  plazo: string | null;
  nota: string | null;
};

export type Concepto = {
  id: string;
  codigo: string;
  nombre: string;
  tipo: "haber" | "descuento";
  imponible: boolean;
  tributable: boolean;
  codigoLre: string | null;
  lreVerificado: boolean;
  activo: boolean;
};

export type OpcionPersona = { id: string; nombre: string };
