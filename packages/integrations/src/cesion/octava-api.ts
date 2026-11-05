// Tipos de la API REST de App Octava (portado de OPAI 1.0 `octava-client.ts`).
// Documentación: https://www.appoctava.cl/wscesion/documentacion-cesion-electronica-api-rest/

export const OCTAVA_BASE_URL = "https://www.appoctava.cl/apirestcesion";

/** 0 = pruebas (certificación), 1 = producción. */
export type OctavaAmbiente = "0" | "1";

/** Códigos del RPETC devueltos por ConsultaEstadoAEC. */
export type OctavaCodigoCesion = "EOK" | "RSC" | "RFS" | "RCR" | "RDC" | "RCS" | "EAN" | "PEN";

export type OctavaRespuestaBase = {
  status?: string;
  message?: string;
  /** TOK/TERR/TDUP/TBLOQ (token) · TVAL/TEXP/TINV/TDUP (resto). */
  DescripcionResultado?: string;
  IdResultadoFE?: string;
  ResultadoFE?: string;
};

export type ObtenerTokenRequest = { RUTACCESOAPI: string; PASSWORDACCESOAPI: string };
export type ObtenerTokenResponse = OctavaRespuestaBase & { Token?: string };

export type CargaXmlCesionRequest = { STRINGXML: string; AMBIENTE: OctavaAmbiente; TOKEN: string };
/** IdResultadoFE: 0 cargado · 1 RUT≠token · 2 tipo inválido · 4 no almacenable · 5 ya cargado (ok). */
export type CargaXmlCesionResponse = OctavaRespuestaBase;

export type CedeDteRequest = {
  FOLIO: string;
  TIPODTE: string;
  RUTEMISOR: string;
  AMBIENTE: OctavaAmbiente;
  DIRECCIONCEDENTE: string;
  EMAILCEDENTE: string;
  RUTCESIONARIO: string;
  RAZONSOCIALCESIONARIO: string;
  DIRECCIONCESIONARIO: string;
  EMAILCESIONARIO: string;
  NOMBRECONTACTO: string;
  EMAILCONTACTO: string;
  MONTOCEDER: string;
  FECHAVENCIMIENTO: string;
  EMAILDEUDOR: string;
  TOKEN: string;
};
/** IdResultadoFE: 0 cedido · 1 no encontrado · 2 error · 3 ya cedido · 4 no es tenedor vigente. */
export type CedeDteResponse = OctavaRespuestaBase;

export type ConsultaEstadoAecRequest = {
  FOLIO: string;
  TIPODTE: string;
  RUTEMISOR: string;
  AMBIENTE: OctavaAmbiente;
  TOKEN: string;
};
export type ConsultaEstadoAecResponse = OctavaRespuestaBase & {
  CodigoCesion?: OctavaCodigoCesion | string;
  UrlAec?: string;
};
