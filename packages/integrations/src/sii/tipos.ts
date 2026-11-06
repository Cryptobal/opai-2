// Adaptador SII para emisión DTE (CAR-137). Interfaz única; certificado y CAF viven cifrados fuera del repo.

export type AmbienteSii = "certificacion" | "produccion";
export type TipoDteVentaSii = 33 | 34 | 61;

export type DteXmlFirmado = {
  xml: string;
  timbrePdf417: string;
};

export type EnvioSiiResultado = {
  trackId: string;
  estado: "enviado";
  glosa?: string;
};

export type ConsultaSiiResultado = {
  estado: "aceptado" | "rechazado" | "reparo" | "pendiente";
  glosa?: string;
};

export type LineaEmisionDte = {
  orden: number;
  glosa: string;
  monto: number;
  cantidad?: number;
  precioUnitario?: number;
};

/** Datos para generar el XML (SimpleAPI v1) o simular; montos y folio ya validados en dominio. */
export type PayloadEmisionDte = {
  ambiente: AmbienteSii;
  tipoDte: TipoDteVentaSii;
  folio: number;
  fechaEmision: string;
  /** Vencimiento contable (AAAA-MM-DD); si no se conoce, no se informa. */
  fechaVencimiento?: string;
  rutEmisor: string;
  rutReceptor: string;
  razonSocialReceptor: string;
  giroReceptor?: string;
  direccionReceptor?: string;
  comunaReceptor?: string;
  ciudadReceptor?: string;
  emailReceptor?: string;
  montos: { neto: number; exento: number; iva: number; total: number };
  glosa?: string;
  lineas?: readonly LineaEmisionDte[];
  /** XML del CAF del rango (obligatorio con SimpleAPI real). */
  cafXml?: string;
  referencias?: readonly { tipoDte: number; folio: number; codigo: number; razon?: string }[];
};

export interface AdaptadorSii {
  readonly nombre: string;
  readonly disponible: boolean;
  firmar(payload: PayloadEmisionDte): Promise<DteXmlFirmado>;
  enviar(xmlFirmado: string, ambiente: AmbienteSii): Promise<EnvioSiiResultado>;
  consultar(trackId: string, ambiente: AmbienteSii): Promise<ConsultaSiiResultado>;
}
