/**
 * Contrato HTTP de SimpleAPI (REST) según su documentación oficial (colección Postman publicada en
 * https://documentacion.simpleapi.cl, revisada el 6-nov-2026, CAR-196). Cada forma de aquí está respaldada por un
 * ejemplo de esa documentación; lo que ella no responde queda anotado como «DECISIÓN CARLOS» en el PR.
 */

import type { AmbienteSii, PayloadEmisionDte } from "./tipos";

/** Host del ejemplo de autenticación de la documentación (`https://api.simpleapi.cl/{endpoint}`). */
export const SIMPLEAPI_BASE = "https://api.simpleapi.cl" as const;
const V1 = `${SIMPLEAPI_BASE}/api/v1`;

export const SIMPLEAPI_RUTAS = {
  generar: `${V1}/dte/generar`,
  envioGenerar: `${V1}/envio/generar`,
  envioEnviar: `${V1}/envio/enviar`,
  consultaEnvio: `${V1}/consulta/envio`,
} as const;

/** RUT del SII como receptor del sobre de envío (ejemplo de la documentación: `RutReceptor: "60803000-K"`). */
export const RUT_SII = "60803000-K" as const;

/**
 * Autenticación Basic con usuario «api» y la API key como contraseña: `Basic base64("api:" + key)` (CAR-240). Es lo que
 * usan OPAI 1.0 (que sí emite) y nuestra consulta de contribuyentes; mandar la key cruda daba HTTP 401 en /dte/generar.
 */
export function encabezadoAuthSimpleApi(apiKey: string): string {
  return `Basic ${Buffer.from(`api:${apiKey.trim()}`, "utf8").toString("base64")}`;
}

export type CredencialesSimpleApiV1 = {
  apiKey: string;
  certificadoPfxBase64: string;
  certificadoClave: string;
  /** RUT del titular del certificado (campo `Certificado.Rut` de la documentación), no el de la empresa. */
  certificadoRut: string;
  /** RUT de la empresa emisora (campo `RutEmpresa` de las consultas). */
  rutEmpresa: string;
  resolucionNumero: number;
  resolucionFecha: string;
  razonSocialEmisor?: string;
  giroEmisor?: string;
  /** Código de actividad económica (ACTECO) del emisor; el SII lo exige en el encabezado del DTE. */
  actecoEmisor?: number;
  direccionEmisor?: string;
  comunaEmisor?: string;
  ciudadEmisor?: string;
};

const fechaSii = (iso: string) => iso.slice(0, 10);

/** 0 = certificación, 1 = producción (documentación: «Ambiente: Certificación = 0, Producción = 1»). */
export const codigoAmbiente = (a: AmbienteSii): 0 | 1 => (a === "produccion" ? 1 : 0);

/** Forma de pago: la documentación pide informarla (1 contado, 2 crédito, 3 sin costo); sin dato rige crédito. */
const FORMA_PAGO_CREDITO = 2;

/** JSON del campo `input` de POST /api/v1/dte/generar (esquema unificado de la documentación). */
export function jsonInputGenerarDte(
  payload: PayloadEmisionDte,
  creds: Pick<
    CredencialesSimpleApiV1,
    | "certificadoRut"
    | "certificadoClave"
    | "razonSocialEmisor"
    | "giroEmisor"
    | "actecoEmisor"
    | "direccionEmisor"
    | "comunaEmisor"
    | "ciudadEmisor"
  >,
): string {
  const lineas = payload.lineas?.length
    ? payload.lineas
    : [{ orden: 0, glosa: payload.glosa ?? "Servicio", monto: payload.montos.total }];
  const documentoExento = payload.tipoDte === 34 || (payload.montos.neto === 0 && payload.montos.exento > 0);
  const detalles = lineas.map((l) => ({
    // Línea exenta o no afecta (documentación: IndicadorExento 0 afecto, 1 exento). Una NC o ND (61/56) sobre una
    // factura exenta también es exenta: sus totales vienen sin neto ni IVA y las líneas deben cuadrar con eso (CAR-234).
    IndicadorExento: documentoExento ? 1 : 0,
    Nombre: l.glosa,
    Cantidad: l.cantidad ?? 1,
    Precio: l.precioUnitario ?? l.monto,
    MontoItem: l.monto,
  }));
  const referencias = (payload.referencias ?? []).map((r) => ({
    // FchRef es la fecha del documento referenciado, no la de este DTE; sin dato, la de emisión (filas antiguas).
    FechaDocumentoReferencia: fechaSii(r.fecha ?? payload.fechaEmision),
    TipoDocumento: String(r.tipoDte),
    ...(r.codigo != null ? { CodigoReferencia: r.codigo } : {}),
    ...(r.razon ? { RazonReferencia: r.razon } : {}),
    FolioReferencia: String(r.folio),
  }));
  return JSON.stringify({
    Documento: {
      Encabezado: {
        IdentificacionDTE: {
          TipoDTE: payload.tipoDte,
          Folio: payload.folio,
          FechaEmision: fechaSii(payload.fechaEmision),
          ...(payload.fechaVencimiento ? { FechaVencimiento: fechaSii(payload.fechaVencimiento) } : {}),
          FormaPago: FORMA_PAGO_CREDITO,
        },
        Emisor: {
          Rut: payload.rutEmisor,
          ...(creds.razonSocialEmisor ? { RazonSocial: creds.razonSocialEmisor } : {}),
          ...(creds.giroEmisor ? { Giro: creds.giroEmisor } : {}),
          // Nombres y forma (lista de ACTECO) tomados del adaptador de OPAI 1.0, que ya emite con SimpleAPI.
          ...(creds.actecoEmisor ? { ActividadEconomica: [creds.actecoEmisor] } : {}),
          ...(creds.direccionEmisor ? { DireccionOrigen: creds.direccionEmisor } : {}),
          ...(creds.comunaEmisor ? { ComunaOrigen: creds.comunaEmisor } : {}),
          ...(creds.ciudadEmisor ? { CiudadOrigen: creds.ciudadEmisor } : {}),
        },
        Receptor: {
          Rut: payload.rutReceptor,
          RazonSocial: payload.razonSocialReceptor,
          ...(payload.direccionReceptor ? { Direccion: payload.direccionReceptor } : {}),
          ...(payload.comunaReceptor ? { Comuna: payload.comunaReceptor } : {}),
          ...(payload.ciudadReceptor ? { Ciudad: payload.ciudadReceptor } : {}),
          ...(payload.giroReceptor ? { Giro: payload.giroReceptor } : {}),
        },
        Totales: {
          MontoNeto: payload.montos.neto,
          ...(payload.montos.exento ? { MontoExento: payload.montos.exento } : {}),
          TasaIVA: payload.montos.iva > 0 ? 19 : 0,
          IVA: payload.montos.iva,
          MontoTotal: payload.montos.total,
        },
      },
      Detalles: detalles,
      Referencias: referencias,
    },
    Certificado: { Rut: creds.certificadoRut, Password: creds.certificadoClave },
  });
}

/** JSON del campo `input` de POST /api/v1/envio/generar (sobre de envío al SII). */
export function jsonInputSobreEnvio(
  payload: { rutEmisor: string; resolucionNumero: number; resolucionFecha: string },
  creds: Pick<CredencialesSimpleApiV1, "certificadoRut" | "certificadoClave">,
): string {
  return JSON.stringify({
    Certificado: { Password: creds.certificadoClave, Rut: creds.certificadoRut },
    Caratula: {
      RutEmisor: payload.rutEmisor,
      RutReceptor: RUT_SII,
      FechaResolucion: fechaSii(payload.resolucionFecha),
      NumeroResolucion: payload.resolucionNumero,
    },
  });
}

/** JSON del campo `input` de POST /api/v1/envio/enviar. `Tipo`: EnvioDTE = 1, EnvioBoleta = 2. */
export function jsonInputEnviarSii(
  ambiente: AmbienteSii,
  creds: Pick<CredencialesSimpleApiV1, "certificadoRut" | "certificadoClave">,
): string {
  return JSON.stringify({
    Certificado: { Password: creds.certificadoClave, Rut: creds.certificadoRut },
    Ambiente: codigoAmbiente(ambiente),
    Tipo: 1,
  });
}

/** JSON del campo `input` de POST /api/v1/consulta/envio. */
export function jsonInputConsultaEnvio(
  rutEmpresa: string,
  trackId: string,
  ambiente: AmbienteSii,
  creds: Pick<CredencialesSimpleApiV1, "certificadoRut" | "certificadoClave">,
): string {
  return JSON.stringify({
    Certificado: { Password: creds.certificadoClave, Rut: creds.certificadoRut },
    RutEmpresa: rutEmpresa,
    TrackId: Number(trackId),
    Ambiente: codigoAmbiente(ambiente),
    ServidorBoletaREST: false,
  });
}
