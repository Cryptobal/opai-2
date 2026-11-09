import type { EtapaCierre, ResumenEtapa } from "@opai/domain";

export type ItemCierre = {
  documentoId: string;
  programacionNombre: string;
  cuentaNombre: string | null;
  periodo: string;
  folio: number | null;
  montoTotal: number;
  etapa: EtapaCierre;
  requiereOcHes: boolean;
  requiereOk: boolean;
  /** Nada bloquea emitirlo hoy (ver `emitibleEnLote`). */
  emitible: boolean;
  ordenCompra: string | null;
  hes: string | null;
  observacion: string | null;
  enviadaEn: string | null;
  recordadaEn: string | null;
  okEn: string | null;
  observadaEn: string | null;
};

export type TableroCierre = { periodo: string; etapas: ResumenEtapa[]; items: ItemCierre[] };

export type ResultadoLote = {
  emitidos: number;
  omitidos: number;
  resultados: { documentoId: string; estado: string; motivo: string | null; folio: number | null }[];
};
