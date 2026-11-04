// Contrato neutral de cesión de DTE (CAR-140, CAR-154). Lo usan las capacidades de Finanzas.

export type EstadoCesionRpetc =
  | "simulada"
  | "enviada"
  | "aprobada"
  | "financiada"
  | "cobrada"
  | "cerrada"
  | "anulada";

export type PayloadCesion = {
  documentoId: string;
  folio: number;
  rutEmisor: string;
  rutDeudor: string;
  montoTotal: number;
  xmlBase64: string;
  factorRut: string;
  tasaBps: number;
  /** Datos que exige Octava (CedeDte). Opcionales para no romper al adaptador simulado. */
  tipoDte?: number;
  factorNombre?: string;
  factorDireccion?: string;
  factorEmail?: string;
  /** Correo del receptor del DTE (deudor), no del factor. */
  emailDeudor?: string;
  /** YYYY-MM-DD del último vencimiento del documento. */
  fechaVencimiento?: string;
};

export type ResultadoEnvioCesion = {
  operacionExternaId: string;
  estado: EstadoCesionRpetc;
};

export type ResultadoConsultaCesion = {
  estado: EstadoCesionRpetc;
  glosa?: string;
};

export interface AdaptadorCesion {
  readonly nombre: string;
  readonly disponible: boolean;
  enviar(payload: PayloadCesion): Promise<ResultadoEnvioCesion>;
  consultar(operacionExternaId: string): Promise<ResultadoConsultaCesion>;
}
